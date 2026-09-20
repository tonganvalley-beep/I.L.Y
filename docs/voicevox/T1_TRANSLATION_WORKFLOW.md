# T1 角色日语台词稿工作流

该工具只处理文本制作，不调用 VOICEVOX、不自动翻译，也不修改游戏中文字幕或 `script-edits.js`。默认只导出当前发布剧情中归类为“台词”的非空节点；旁白、内心、演出、删除项、代理节点和玩法结构不会混入角色稿。

## 1. 导出待译稿

在仓库根目录执行：

```powershell
npm run voice:translations -- export
```

输出位于 `game/data/voice/translations/export/`：

- `all-lines.tsv`：按剧情生效顺序排列的总表。
- `speakers/*.tsv`：按原始角色名拆分的工作表，仍保留章节、场景、顺序及前后文。
- `manifest.json`：本次源版本、数量和角色文件清单。

TSV 使用 UTF-8 BOM，并按标准引号规则保留制表符、引号和多行内容。`order` 只帮助阅读，禁止用它关联台词；`line_id` 才是稳定键。不要修改 `line_id`、中文源字段、角色、章节、`source_fingerprint` 或 `source_revision`。

需要人工填写的字段：

- `speech_text`：日语合成文本，不能留空。
- `translation_status`：`draft`（草稿）或 `proofread`（已校对）。仅 `proofread` 可进入正式生产。
- `translation_note`：翻译、称谓或语气说明。
- `pronunciation_note`：专名和读音说明。

确实需要制作旁白时显式加 `--include-narration`；导出和回导必须使用相同开关。角色别名不会自动模糊合并，避免把不同人物静默归为同一声音。

## 2. 回导与校验

编辑完全部 `speakers/*.tsv` 后执行：

```powershell
npm run voice:translations -- import game/data/voice/translations/export
```

传入完整导出目录时，工具自动读取 `speakers/`，不会把同内容的总表重复导入。成功后写入 `game/data/voice/translations.json`。只要发现重复 ID、未知 ID、缺失 ID、空日文、无效状态或源文/角色/章节/版本变化，整次回导都不会写文件。

分角色或分章节制作可显式允许暂缺其他 ID：

```powershell
npm run voice:translations -- import path/to/one-role.tsv --allow-missing
```

这只降低“缺失 ID”为警告；重复、未知、空日文和源变化仍会阻止写入。再次回导会按 `line_id` 合并，并只保留源指纹仍匹配的旧翻译。若报告 `SOURCE_CHANGED`，重新导出并人工对照，工具不会按文本相似度自动重绑。

## 3. 交给 VOICEVOX

翻译初稿按配音角色分批导入编辑器：

```powershell
npm run voice:translations -- export-voice-batches
```

输出位于 `game/data/voice/voicevox-import/`，每个配音角色一份 TSV，可在项目配音编辑器中逐个批量导入并统一设置 VOICEVOX 风格。角色归并由 `game/data/voice/speaker-role-map.json` 显式控制：“成田基生”和“基生”归为同一角色；普通“爱理”、带引号的“爱理”和“百合沢爱理”（亦写作“百合尺爱理”）共用 `百合沢爱理.tsv`。从第二章 `ch2_251`（成年“爱理”首次开口）至第三章 `ch3_150`（“再见了，基生君。”）的“爱理／成年“爱理””台词，以及女主视角中明确标为“成年爱理”的台词，共用 `成年爱理.tsv`。原始显示标签仍保留在 `source_speaker` 列。

完成校对后，正式生产稿使用：

```powershell
npm run voice:translations -- export-ready
```

输出位于 `game/data/voice/translations/ready/`。每个角色有一份日语 TXT 和一份同名 `.ids.tsv` 清单；TXT 保持剧情顺序，ID 清单是后续关联依据。只有 `proofread` 且源指纹仍匹配的项目会输出。不要只凭 TXT 行号或日文内容重新匹配游戏台词。

少量格式示例见 `docs/voicevox/examples/translation-sample.tsv`。该文件明确是示例，不代表全篇翻译。
