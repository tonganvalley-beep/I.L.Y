# I.L.Y. VOICEVOX 批量导入与语音微调编辑器：实现方案

> 状态：P1-P5 已按本方案完成，2026-09-16。本文保留实现边界、数据契约和验收基线；实际交付证据见 `reports/P1.md` 至 `reports/P5.md`。游戏语音播放链路已于 2026-09-17 完成 P6（见 reports/P6.md），下文后续范围措辞保留为原始设计记录，本文也不代表已经生成全篇生产配音。

## 1. 结论与范围

建议在现有零依赖 Node 本地服务器和原生 HTML/CSS/JavaScript 技术栈内增加一个独立的本地制作工具。浏览器负责导入预览、逐句编辑、试听和队列控制；Node 服务负责读取最终剧本视图、代理本机 VOICEVOX Engine、原子保存工程数据以及写入 WAV。P4 输出供后续使用的轻量语音清单，但编辑器首期不修改游戏播放逻辑；游戏运行时接入是单独调度的 P6。

已经确定的语言策略是：游戏继续显示中文，VOICEVOX 只合成日语。每条记录必须分别保存 `displayText`（中文字幕快照）和 `speechText`（日语配音原文）；二者不得互相覆盖，也不得在缺少日语时把中文自动送入日语 TTS。翻译本身不属于本编辑器职责。

编辑器整体范围包括：读取项目有效剧本、表格/JSON 批量导入、说话人和风格选择、AudioQuery 生成、全局参数与音素级微调、单句试听、可取消的批量合成、工程保存恢复，以及输出供后续游戏接入的语音清单。P1 首期只完成总控书定义的最小端到端闭环；批量队列、精细调音和游戏关联分别属于 P2-P4。机器翻译、自动选角、VOICEVOX 用户词典或预设写入、跨机器云服务、多人协作和全自动一键重配全篇不在编辑器范围；游戏播放属于 P6 后续范围。

内容制作的标准顺序应固定为：从游戏有效剧本导出中文翻译对照稿 -> 按剧情角色拆分日语稿并由人工翻译/校对 -> 编辑器按稳定 ID 导入 `speechText` -> 生成并微调 AudioQuery -> 试听 -> 批量合成 -> 发布游戏语音清单。VOICEVOX 只负责日语语音分析与合成，不负责把中文翻译成日语；引擎接口能接收一段文本，也不代表中文能被日语音声库正确朗读。

## 2. 已查证事实

以下是本次直接读取代码或本机接口得到的事实。后文标为“建议”的内容尚待实现和验收。

### 2.1 仓库现状

- `tools/serve.mjs` 是仅绑定 `127.0.0.1` 的零依赖 Node HTTP 服务，静态文件根目录为仓库根目录；目前只有 `/api/script-review` 动态接口。静态 MIME 表已有 MP3/OGG，没有 WAV。
- `tools/script-review-api.mjs` 已建立可复用的本地写入范式：同源/Host 校验、请求体上限、SHA-256 revision、进程内串行保存、临时文件、`.bak` 备份、原子替换和 `409` 并发冲突。
- 剧情基础数据来自 `game/data/story/{prologue,chapter1,chapter2,chapter3,heroine,final}.js`。`tools/import-script-review.mjs` 通过沙箱执行这些文件并调用 `ILY.prepareChapter1()` 得到统一的 `story.nodes`。
- 六个原始 story 的节点数相加为 1,874。`ILY.prepareChapter1()` 在存在 `ch2_g2` 时额外创建运行时摄影节点 `ch2_photo`，因此本次调用统一加载函数得到 1,875 个组装节点，其中 `dialogue` 1,108、`monologue` 444、`heroine-card` 53、`cue` 230。`ch2_photo` 是 `photo` 玩法节点，不是配音台词；实现仍应按节点语义筛选，不能把总数硬编码为配音句数。
- `game/data/story/script-edits.js` 当前有 279 条已发布修改，包括 17 条新增和 23 条删除。回归测试明确要求基础数据先加载、已发布编辑覆盖基础、本地浏览器草稿再覆盖已发布字段。
- `game/src/script-review-model.js` 会为每个有效节点设置 `reviewId`。当一条原文前面插入新段落时，原节点键成为只负责跳转的代理 `cue`，正文键变成 `${原ID}__review_body`，但正文的 `reviewId` 仍为原 ID；新增段落的节点键和 `reviewId` 都是其 `review_*` ID。
- `game/src/main.js` 在挂载节点前把运行时键写入 `node.id`；`game/src/script-editor.js` 已使用 `node.reviewId || node.id` 作为编辑器当前 ID。语音关联应沿用这个规则，并只在可发声节点挂载后查找，避免代理 `cue` 与正文重复播放。
- 当前剧本正文是中文。`game/src/i18n.js` 的中英文切换覆盖菜单等界面文案，并未给剧情节点提供完整的英语或日语正文层。
- `game/data/assets.js` 已登记 `assets/audio/voices/<角色>/` 目录，但文件夹目前只有 `.gitkeep`；文件注释也明确写着 voices 尚未接线播放。`game/src/core/assets.js` 和 `game/src/modes/dialogue.js` 当前只实现循环 BGM。
- 基础剧情的部分顺序 ID（例如 `ch1_###`）由构建器生成，源文件前方增删内容可能使其漂移。已发布 `review_*` 新增 ID 是 UUID 形式。现有 `script-edits` 校验会拒绝不存在的锚点，但没有跨版本模糊重绑。

### 2.2 本机 VOICEVOX Engine 0.25.2

本次只读访问了 `http://127.0.0.1:50021/version`、`openapi.json`、`speakers` 和 `engine_manifest`，没有调用合成、用户词典、预设或设置写接口。

- 版本为 `0.25.2`；engine UUID 为 `074fc39e-678b-4c13-8916-ffca8d505d1d`；manifest 版本为 `0.13.1`；默认采样率为 24,000 Hz。
- 本机返回 43 个 speaker、127 个 `talk` style。style ID 是合成接口的 `speaker` 参数；工程仍应同时保存 speaker UUID、speaker/style 名称和 style ID，以便检测安装差异，不能只保存下拉框序号。
- `POST /audio_query` 接受 `text`、整数 `speaker`、可选 `enable_katakana_english` 与 `core_version`，返回 `AudioQuery`。
- `POST /synthesis` 与 `POST /cancellable_synthesis` 接收 JSON `AudioQuery` 和 style ID，返回 `audio/wav`。OpenAPI 明确将后者标为“音声合成する（キャンセル可能）”。`POST /multi_synthesis` 返回 ZIP，但不提供逐句进度和清晰的单句取消边界，不建议用于 P2 队列。
- `POST /accent_phrases` 可从文本生成重音短语；`POST /mora_data`、`/mora_pitch`、`/mora_length` 可重算音素数据的全部、音高或时长。
- `AudioQuery` 包含 `accent_phrases`、`speedScale`、`pitchScale`、`intonationScale`、`volumeScale`、首尾无声长度、停顿设置、输出采样率/声道和 `kana`。每个 `Mora` 包含显示文本、辅音及其时长、元音及其时长和音高。
- manifest 声明支持 mora 音高、音素时长、语速、整体音调、语调、音量、停顿和疑问句上扬调整。
- engine 使用条款要求标注使用 VOICEVOX；生成音频还必须遵守每个音声库各自的规约。因此选择角色时必须展示并记录其许可/署名信息。本文没有替项目选择默认角色，也没有复制接口返回的 icon 或大段 license 内容。

## 3. 建议架构

### 3.1 技术栈

沿用 Node 22 内置模块、原生 `fetch`、原生浏览器 API 和现有无打包前端，不新增框架或数据库。这样能复用项目启动方式、VM 剧本加载和 revision 保存协议，也避免为了一个只在本机使用的制作工具引入第二套构建链。

建议模块边界如下，名称是实现建议而非现有文件：

| 模块 | 建议职责 |
|---|---|
| `tools/voicevox/story-source.mjs` | 加载基础剧情和已发布 `script-edits`，产出唯一的“有效剧情视图”和 source revision |
| `tools/voicevox/import.mjs` | 编码检测、CSV/TSV/JSON 解析、字段校验、导入预览与冲突报告；保持为纯函数 |
| `tools/voicevox/engine-client.mjs` | 固定访问本机 Engine，校验响应、超时、AbortSignal 与版本/能力探测 |
| `tools/voicevox/project-store.mjs` | 工程和逐句 AudioQuery 的 revision、备份、临时文件与恢复 |
| `tools/voicevox/render-queue.mjs` | 串行状态机、取消、代次检查、临时 WAV 和发布清单 |
| `tools/voicevox-api.mjs` | 同源本地 API；只组合上述模块，不放解析或队列业务规则 |
| `game/voicevox-editor.html` 与 `game/src/voicevox-editor/*` | 导入预览、筛选、参数面板、音素表、试听、队列和错误恢复 UI |
| `game/data/voice/voice-manifest.js` | P4 输出的发布映射，供 P6 使用；P4 不改游戏运行时 |
| `game/src/core/voice.js` | P6 后续模块：游戏语音加载、播放、停止和音量开关 |

编辑器 API 应挂到现有 `tools/serve.mjs`，浏览器只访问同源 `/api/voicevox/*`。浏览器不应直接写文件，也不应接受用户提供任意 Engine URL。服务端目标固定为 `http://127.0.0.1:50021`，可用受限启动参数覆盖端口，但必须继续限制为 loopback，以避免成为 SSRF 或开放代理。

### 3.2 界面组织

建议使用三栏工作区：左侧是章节/场景/角色/状态筛选和批量选择；中间是稳定 ID、中文显示文本、日语配音文本、角色风格及队列状态的高密度列表；右侧是当前句的全局参数、重音短语与 mora 编辑。顶部工具栏放导入、保存、引擎状态、生成 AudioQuery、试听、加入队列和取消；底部固定显示当前任务与错误。参数改动应有数值输入和滑杆，音素时长与音高用可键盘操作的表格/曲线，不把实现说明写进产品界面。

## 4. 数据契约

### 4.1 稳定台词身份

`lineId` 的项目内定义为有效节点的 `node.reviewId || node.id`：

- 原始节点即使因“前插”被移到 `__review_body`，仍使用原始 `reviewId`。
- 新增节点使用已经发布的 `review_*` UUID。
- 代理 `cue`、删除后变成的空 `cue`、玩法和结构节点默认不进入可配音清单。
- 默认候选为有非空文本的 `dialogue`；`monologue` 和 `heroine-card` 可显式纳入，内心/演出 `cue` 默认排除。是否给旁白配音是项目级筛选选择，不由节点总数推导。
- 重复中文或重复日文不是同一台词的证据；不同 `lineId` 必须保留为不同记录。

每次刷新剧本时按 `lineId` 精确关联。相同 ID 而 `displayText`、speaker 或 kind 改变时保留日语和人工参数，但标记 `sourceChanged` 等待人工核对；ID 消失时标记 `orphaned`，不模糊迁移到“最相似”文本。对于会漂移的构建器 ID，长期改进应在源构建器中引入显式 ID；编辑器首期只报告漂移，不擅自改剧情生成规则。

### 4.2 工程记录

建议的逻辑结构如下。保存时可以把大型 `audioQuery` 拆到逐句文件，外部契约保持一致：

```json
{
  "schemaVersion": 1,
  "projectRevision": "sha256-of-authoring-state",
  "source": {
    "storyRevision": "sha256",
    "scriptEditsRevision": "sha256"
  },
  "engine": {
    "uuid": "074fc39e-678b-4c13-8916-ffca8d505d1d",
    "version": "0.25.2",
    "defaultSamplingRate": 24000
  },
  "lines": [
    {
      "lineId": "fin_116",
      "storyRef": {
        "chapter": "final",
        "scene": "S07",
        "kind": "dialogue",
        "speaker": "ILY"
      },
      "displayText": "人们对于他人的牵挂之情……",
      "speechText": "人が誰かを想う気持ちは……",
      "sourceFingerprint": "sha256-of-visible-source-fields",
      "voice": {
        "speakerUuid": "uuid-from-speakers",
        "speakerName": "名称快照",
        "styleId": 0,
        "styleName": "スタイル名快照"
      },
      "querySource": {
        "speechTextHash": "sha256",
        "styleId": 0,
        "engineUuid": "uuid",
        "engineVersion": "0.25.2",
        "coreVersion": null,
        "enableKatakanaEnglish": true
      },
      "audioQueryRef": "queries/<voiceKey>.json",
      "status": "ready",
      "render": {
        "renderHash": "sha256",
        "path": "assets/audio/voices/generated/<voiceKey>-<renderHash>.wav",
        "durationMs": 0,
        "generatedAt": "ISO-8601"
      }
    }
  ]
}
```

`displayText` 是审校和漂移检测用的中文字幕快照，游戏仍以剧情节点文字为显示真源；编辑器不能借保存配音工程修改 `script-edits.js`。`speechText` 是日语合成真源。空 `speechText` 的状态为 `missingSpeechText`，不能排队。

建议用完整 `lineId` 计算 `voiceKey = base64url(SHA-256(lineId))`，并在工程和发布清单中保留反向映射；不要把任意 ID 直接拼成 Windows 文件名。WAV 文件名包含 `renderHash`，使浏览器缓存天然失效。新发布清单生效后，旧衍生 WAV 先列入可清理报告，只有显式执行清理才删除。

### 4.3 游戏发布清单

`voice-manifest.js` 只包含运行时必要字段，例如：

```js
ILY.data.voices = {
  "fin_116": {
    src: "assets/audio/voices/generated/abc123-9f8e7d.wav",
    credit: "VOICEVOX: 音声库名"
  }
};
```

AudioQuery、日语原文、引擎地址、队列日志和本地草稿不进入运行时清单。发布动作必须确认选用音声库的署名文本，并生成集中 credits 数据；最终展示位置由总控书确定。

## 5. 导入规则

### 5.1 文件与编码

P1 支持 TXT 导入；P2 扩展为 `.json`、`.csv`、`.tsv`、粘贴 TSV 和多文件导入。TXT 剧情源格式差异大，不应以启发式规则猜测人物、舞台说明和台词。对用户已经准备好的日语 TXT，提供两个显式模式：推荐的 `lineId<TAB>speechText`；以及兼容旧稿的“选定一个角色/场景后，每个非空物理行按当前过滤顺序对齐一条台词”。后者必须要求数量完全一致、逐行显示中文/日文对照并由用户确认，任何过滤条件或源 revision 变化都使预览失效。普通 TXT 不承载多行台词；多行内容在 P2 使用 CSV/TSV 引号字段或 JSON。

编码处理顺序：先识别 UTF-8、UTF-16LE、UTF-16BE BOM；无 BOM 时用 fatal UTF-8 解码；失败后停止并要求用户在 `GB18030`、`Shift_JIS`、`UTF-16LE`、`UTF-16BE` 中明确选择并重新预览。不得把乱码替换字符静默保存。解码后移除开头 BOM、把 CRLF/CR 规范为 LF、拒绝 NUL；字段内部换行保留，行尾空格默认保留但在预览中提示。应设文件大小、记录数和单字段长度上限，错误必须包含文件、逻辑记录号和字段名。

### 5.2 结构化格式

CSV/TSV 必须使用真正的状态机解析，遵循 RFC 4180 的双引号、`""` 转义和引号内换行规则，不能用 `split('\n')` 或 `split(',')`。分隔符由扩展名和预览选择确定；首行是表头。规范字段如下：

| 字段 | 要求 |
|---|---|
| `line_id` | 推荐；关联现有剧情时必须是有效 `lineId` |
| `display_text` | 可选核对列；与当前中文字幕不一致时只报冲突，不覆盖剧情 |
| `speech_text` | 必填日语原文；允许字段内换行 |
| `speaker` | 可选的剧情人物名；用于核对/默认映射，不等于 VOICEVOX speaker |
| `speaker_uuid` | 可选；与 `style_id` 一起精确选音声库 |
| `style_id` | 可选整数；必须存在于当前 `/speakers` 且属于该 UUID |
| `external_key` | 可选外部表稳定键，便于再次导入对账 |

JSON 接受 `{ "schemaVersion": 1, "lines": [...] }`，字段使用工程契约的 camelCase 名称。未知字段在预览中报告，P2 不原样透传。所有格式必须先生成只读预览和错误清单，确认后才合并工程。

### 5.3 多行、空白和重复

- CSV/TSV 中，引号字段里的 LF 是同一条 `speechText` 的一部分；未加引号的物理换行结束记录。JSON 字符串用 `\n` 表示换行。
- `speechText` 只包含空白时视为缺失；非空字段不做全角/半角、标点、汉字或假名自动替换。可另提供显式“规范换行为空格”的批处理并显示差异。
- 同一个导入批次出现两次相同 `line_id` 或相同 `external_key`，即使内容相同也报冲突并阻止确认，避免顺序决定结果。
- 与工程已有 `line_id` 相同的行进入 update 预览，只更新用户勾选的 `speechText`/voice 字段；绝不覆盖现有 AudioQuery 而不先显示失效影响。
- 不同 ID 的相同 `speechText` 合法，不合并、不共享可变 AudioQuery。合成缓存可以按完整 render hash 复用同一 WAV，但发布清单仍保留两个 ID。
- 缺少 `line_id` 的行可作为 `unlinked` 记录导入，并生成 UUID；每次重复导入都会被视为新记录。若要可重复对账，应提供唯一 `external_key`。未关联记录不能发布到游戏。
- `display_text` 与当前有效剧情不一致、ID 不存在或 ID 指向不可发声结构节点都不是可忽略警告；必须在预览中选择跳过、保留为未关联或回到源文件修正。

### 5.4 上游翻译对照稿

如果日语稿尚未存在，不能等语音编辑器和合成队列全部完成后才开始翻译。有效剧本提取/对照导出是后续“游戏关联”工作的子项，但应在第一批内容制作前提前实现。导出器必须读取“基础节点 + 当前已发布 `script-edits`”的有效视图，不能从原始 TXT 或只从基础 JS 导出，否则会漏掉 17 条新增并带回 23 条已删除内容。

建议每个剧情人物输出一份 UTF-8 BOM TSV，另附一份总表。每行至少包括：

| 列 | 用途 |
|---|---|
| `line_id` | 不允许译者修改的稳定关联键 |
| `chapter` / `scene` / `route` | 定位剧情与分支 |
| `order` | 本次导出中的显示顺序，只用于阅读，不作为身份 |
| `speaker` / `kind` | 角色和台词类型 |
| `display_text` | 当前已发布中文字幕，只读对照 |
| `context_before` / `context_after` | 相邻中文上下文；分支处标记候选而不伪装成唯一顺序 |
| `speech_text` | 译者填写并校对的日语台词 |
| `translation_note` / `pronunciation_note` | 语气、称谓、专名读法等人工说明 |
| `source_revision` | 防止旧翻译表静默覆盖新剧本 |

按角色拆文件时仍保留原始 `speaker` 字段；角色别名是否合并由一份受审阅的映射配置决定，不能用字符串近似自动合并。导出 CSV/TSV 时正确引用换行、引号和制表符。再次导入只消费 `line_id`、`speech_text`、备注及明确允许的 voice 字段；`display_text`、章节、角色或 source revision 不一致时显示差异并要求重新对照，绝不把翻译表反向写入中文字幕。

对用户已有的按角色日语 TXT，可先用上述严格顺序模式完成小批量导入和 P1 级能力验证；这批记录只有在成功绑定有效 `lineId` 后才能发布。正式从游戏全量制作配音前，应先完成本节的有效剧本提取和按角色对照导出，以便翻译稿从起点就携带稳定 ID，而不是事后依赖行号或文本相似度补关联。

## 6. AudioQuery 与微调失效规则

所有编辑都应区分“查询失效”和“试听/成品失效”。任何会改变声音的字段变化都会使现有试听和发布 WAV 变为 `renderStale`，但不一定要丢弃人工音素编辑。

| 操作 | AudioQuery 处理 | 人工音素编辑 |
|---|---|---|
| 修改 `displayText`、章节、场景或剧情人物标签 | 不失效；标记剧情源待核对 | 保留 |
| 修改 `speechText` | 整份 query 失效，需重新调用 `/audio_query` | 丢弃旧 query，但在历史快照中可恢复 |
| 修改 style ID、core version、片假名英语开关 | 整份 query 失效 | 同上 |
| Engine UUID 或版本变化 | 标记 `engineMismatch`；允许查看旧值，不自动覆盖 | 用户明确重新生成后才替换 |
| 修改 speed/pitch/intonation/volume scale、首尾静音、停顿缩放、采样率/声道 | query 本身仍有效，直接改字段 | 保留 mora 数据 |
| 修改重音位置、短语边界、mora 文本/音素 | 结构变更；需显式重算 | `/mora_data` 会重置全部 mora 音高和时长，必须二次确认 |
| 执行“只重算音高” | 调 `/mora_pitch` | 保留时长，覆盖所有 pitch |
| 执行“只重算时长” | 调 `/mora_length` | 保留 pitch，覆盖所有辅音/元音时长 |
| 手工改 mora pitch/length 或 pause mora | 不请求 Engine | 只改选中值；成品失效 |

每次替换 query 前保存一份有限历史（建议每句最近 10 个版本），历史项记录原因、时间和源 hash。撤销恢复后仍要重新试听/合成。UI 不应在用户移动重音或更换风格时后台静默重算。

## 7. Engine 接口与队列语义

### 7.1 本地 API

建议提供以下同源接口，具体 URL 可在实现时收敛：

- `GET /api/voicevox/status`：聚合 version、engine manifest 的选取字段、speaker/style 列表和能力；不返回 icon/大段 license。
- `GET /api/voicevox/project`：返回工程、source revision 和 project revision。
- `POST /api/voicevox/import/preview`：只解析、校验和给出合并差异，不保存。
- `POST /api/voicevox/query`：为单句生成或按规则重算 query。
- `POST /api/voicevox/preview`：单句可取消合成，返回 WAV 流或临时 blob，不发布。
- `POST /api/voicevox/project`：携带 revision 保存工程；冲突返回 `409`。
- `POST /api/voicevox/jobs`、`GET /api/voicevox/jobs`、`DELETE /api/voicevox/jobs/:id`：创建、观察和取消合成任务。
- `POST /api/voicevox/publish`：校验所有选中记录后原子更新运行时清单；不隐式加入未生成句子。

Engine 错误需规范化为稳定代码（如 `ENGINE_OFFLINE`、`STYLE_MISSING`、`QUERY_INVALID`、`ENGINE_TIMEOUT`、`CANCELLED`、`WRITE_FAILED`），同时保存截断后的原始状态码和消息用于排查。不得把任意 Engine 响应当成可信文件名或 HTML。

### 7.2 状态机与取消

默认只运行 1 个合成任务；并发数即使可配置也应有很小上限。队列不嵌入作者工程 JSON，但必须有独立的持久化 journal，例如 `game/data/voice/work/render-journal.json`。journal 保存 job ID、固定输入快照、generation、render hash、状态、尝试次数、临时/目标路径和错误摘要；每次入队及状态转换均以临时文件加原子替换持久化。单句状态建议为：

```text
queued -> querying -> ready -> synthesizing -> writing -> completed
   |          |                    |             |
   +----------+--------------------+-------------+-> cancelled
                         \--------------------------> failed
completed --参数或文本变化--> stale
```

精确定义如下：

- 取消 `queued`：立即从队列删除，状态为 `cancelled`，不访问 Engine。
- 取消 `querying`：中止 `/audio_query` 的 fetch；丢弃晚到响应，不修改 query。
- 取消 `synthesizing`：使用 `/cancellable_synthesis` 并向下传递同一个 AbortSignal；客户端断开时服务端也中止上游请求。只有浏览器取消不足以证明 Engine 计算已停，集成测试必须观察服务端和任务状态。
- 取消 `writing`：WAV 先写同目录临时文件；若尚未进入原子 rename 提交点，则删除临时文件并标记取消。rename 成功后任务即为 `completed`，随后到达的取消返回“已完成”，不能删除已发布资产。
- “取消全部”取消当前请求并清空尚未开始的队列，不影响已完成 WAV 或发布清单。
- 每次排队记录 `generation` 和 `renderHash`。任务完成时若当前行 generation 已变化，结果只可作为未采用缓存保存或直接丢弃，绝不能覆盖较新的设置。
- 失败不自动无限重试。网络/Engine 瞬时失败可由用户显式重试；422 数据错误必须先修数据。恢复应用后，遗留的 `querying/synthesizing/writing` 状态统一标为 `interrupted`，由用户重新排队。
- 服务重启后从 journal 恢复 `queued`、`failed`、`interrupted` 和已完成摘要；先校验工程 revision、输入 hash、临时/目标文件，再由用户点击恢复派发。崩溃时处于活动阶段的任务不得直接标成完成，队列暂停状态也应跨重启保留。
- 批量任务必须先显示句数、估算范围和目标目录，再由用户启动；实现阶段的测试和启动编辑器都不得自动触发全量合成。

## 8. 保存、备份与恢复

工程保存沿用剧本 API 的乐观并发：GET 返回内容和 SHA-256 revision；POST 必须带原 revision；不匹配返回 `409`，要求导出当前草稿后重新载入。所有保存请求在服务进程内串行。

大型 AudioQuery 建议按 `voiceKey` 分文件保存在 `game/data/voice/queries/`，工程索引最后提交。一次保存先把变更写入同目录唯一临时文件并 fsync/关闭，校验可重新解析后再 rename；正式索引替换前写 `.bak`。索引是提交标记：崩溃留下的临时或孤立 query 不会被当前工程引用，启动时列为可恢复/清理项。不要把 query 放进 `localStorage`。

浏览器未保存编辑可在 IndexedDB 保存带 `projectRevision` 的恢复草稿；重开时只提供“恢复草稿 / 使用项目版本 / 导出草稿”选择，不自动覆盖项目。显式“保存工程”才写仓库。试听 blob 是会话数据；队列运行状态不进入作者工程，但按 7.2 节写入独立持久化 journal，使服务重启后可校验并恢复。已完成但尚未发布的 WAV 作为构建产物登记在工程中。

发布动作分两步：先验证每个选中行的当前 render hash、WAV 存在性、许可署名和有效剧情 ID，再用临时文件原子替换 `voice-manifest.js`。发布不修改 `script-edits.js`。恢复 `.bak` 或历史工程后，如果引用的 WAV 不存在，应标为 `missingAsset`，不能假装可播放。

## 9. P6 后续游戏播放设计

本节只记录 P6 的接口约束，不属于 P1-P5 编辑器交付，也不授权当前阶段修改游戏运行时。P4 只生成并验证 manifest。

游戏启动时在剧情和 `script-review-model.js` 之后加载已发布语音清单。对白挂载时使用 `voiceLineId = node.reviewId || node.id` 查询。由于 `resolveScriptCues` 会跳过代理和删除节点，语音播放应放在最终节点挂载路径，而不是在“进入任意 story key”时播放。

建议的播放规则：

- `dialogue` 默认播放；被项目显式纳入的 `monologue`/`heroine-card` 也可播放；`cue`、choice 和玩法不自动播放。
- 中文字幕始终来自当前 `node.text`，不从配音工程反写；`speechText` 只参与离线合成。
- 进入下一节点、回滚、读档、切换模式、退出页面时立即停止当前语音并释放事件监听；暂停/菜单策略应与 BGM 分开定义。
- P6 默认在快进时停止语音并按现有节奏推进，避免长语音阻塞；普通自动播放是否等待语音结束由 P6 决定。P1-P5 不改变现有手动点击推进语义。
- 音乐开关不应兼任语音开关。增加独立语音开关和音量；旧存档缺少设置时使用明确默认值，剧情进度存档不需要保存音频播放位置。
- 同一 `lineId` 的源文本发生变化而 manifest 仍是旧 source fingerprint 时，开发模式给出警告；发布校验必须阻止这种不一致。

## 10. 测试与验收

### 10.1 纯逻辑单元测试

- BOM 与 UTF-8/UTF-16/GB18030/Shift_JIS 显式解码、乱码拒绝、CRLF 规范化和 NUL 拒绝。
- CSV/TSV 引号、双引号转义、字段内换行、空字段、超限输入和带逻辑行号错误。
- 批次内重复 ID、重复文本不同 ID、已有记录 update、无 ID unlinked、无效/删除/结构节点关联。
- 有效剧情合并遵守基础 -> 已发布 `script-edits`；17 条新增只出现一次，23 条删除不进入默认候选。
- 特别覆盖“before 插入”：代理键和 `__review_body` 共享 reviewId 时只生成一条可配音记录，并关联原 ID；新增 `review_*` 是独立记录。
- 失效矩阵的每一种操作、query 历史、generation 防止晚到结果覆盖。

### 10.2 API 与存储测试

- 复用剧本 API 的 Host、Origin、跨站、Content-Type、大小限制和 `409` 竞争测试。
- 使用假的 Engine server 验证参数编码、AudioQuery/422/超时/断开、speaker/style 缺失和响应大小限制。
- 排队顺序、queued/querying/synthesizing/writing 各阶段取消、取消全部、重启后的 interrupted 恢复。
- 临时文件、备份、rename 失败、索引最后提交、孤立文件扫描和发布前 WAV/hash 校验。
- Engine 版本或 UUID 变化时只标记 mismatch，不静默覆盖 query。

### 10.3 编辑器浏览器测试与 P6 后续测试

- 桌面和 390 px 移动视口下编辑器无控件遮挡；长 ID、长日文、多行文本和音素表不会撑破布局。
- P4 验证原始节点、after 新增、before 新增后的正文和新增句分别导出正确 manifest 项；删除句与代理 cue 不进入 manifest。
- 以下留给 P6：连续点击、回滚、读档、快进、菜单及模式切换不串音；中文字幕始终来自 `node.text`；缺失/损坏 WAV 和自动播放限制不阻塞剧情。

验收时使用少量固定夹具和短测试句，不运行全篇合成。涉及真实 VOICEVOX 的集成测试应显式 opt-in；常规 `npm test` 使用假 Engine，保证开发机未启动 VOICEVOX 时仍可运行。

## 11. 分阶段任务与工作量估计

以下直接对应总控书的工作包。按 1 名熟悉仓库的工程师估算有效工作日，仅用于范围判断，不是交付承诺；视觉反复、日语翻译、选角试听、许可确认和全篇人工听审不计入代码估算。

| 阶段 | 交付与验收点 | 估计 |
|---|---|---:|
| T1 上游台词稿工具 | 有效中文剧本提取；按角色导出带 ID/上下文的中日对照稿；按 ID 回导日语和校对状态；复用 P4 身份规则 | 1.5-2.5 日 |
| P1 最小端到端闭环 | 独立入口；引擎检测；TXT 预览；声音选择；基本参数；试听；工程保存/重开；单句 WAV | 2.5-4.0 日 |
| P2 批量制作 | CSV/TSV 与多文件；筛选和批量值；工程角色预设；独立持久化队列 journal；取消/恢复；批量 WAV 与清单 | 3.0-4.5 日 |
| P3 精细调音 | 重音短语、逐 mora 音高/时长、停顿、对比试听、撤销历史和完整失效矩阵 | 2.0-3.5 日 |
| P4 游戏剧本关联 | 发布 edits 有效视图、reviewId/代理语义、增量同步、过期检测、稳定 ID WAV 与 manifest；不改运行时 | 2.0-3.0 日 |
| P5 加固与交付 | 5,000 条工作表验证、断连/重启恢复、边界修复、真实引擎少量抽样、中文文档 | 1.5-2.5 日 |
| **编辑器与制作链合计** | T1 + P1-P5；不含翻译、内容生产和人工听审 | **12.5-20.0 日** |
| P6 游戏播放接入（后续） | manifest 播放、中断与不串音、音量、自动播放和缺失资产降级 | **1.5-2.5 日，另行调度** |

执行顺序以总控书为准：编辑器为 P1 -> P2 -> P3 -> P4 -> P5；T1 可先于或配合 P1 推进，并在正式游戏配音生产前提供已校对角色日语稿。P6 不阻塞编辑器交付，只在 Astra 单独调度后实施。

## 12. 默认值与阶段性决定

以下事项不阻塞 T1/P1 编码；先采用保守默认值，在真正影响相应阶段时再确认：

1. T1/P4 默认只选入归类为“台词”的非空节点；旁白、`monologue`、`heroine-card`、内心、演出、删除项和结构节点默认排除。P4 提供预览和用户显式选入旁白的能力，不要求编码前先决定全篇旁白策略。
2. 编辑器从本机 `/speakers` 动态列出声音和风格，由用户在界面试听并选择。工程可以保存角色默认映射，但不替用户做审美选角；已选 style 缺失时标为待重新映射。只有正式发布前才必须完成实际所用音声库的许可与署名核对。
3. P1-P5 不改变游戏推进。音频结束是否影响自动推进、快进和菜单暂停属于 P6 决定；P6 未定时保留现有手动点击节奏，并保证无语音也可正常游玩。
4. P1 的单句 WAV 可留在本地作者工作区。WAV 是否纳入 Git 或通过其他制品渠道分发，只需在 P4 发布 manifest 前确定，不阻塞最小闭环。
5. 当前先按 `reviewId || node.id` 关联并检测 ID/源文漂移。为顺序生成节点补显式 ID 是长期加固项，不阻塞 T1/P1；任何漂移都进入人工增量预览，不做模糊自动重绑。

全篇批量合成仍需等待 schema、角色映射、许可署名以及相应日语翻译/校对状态达到生产要求；这项生产门槛不等于阻塞前期工具实现。
