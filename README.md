# I.L.Y.

游戏改造与后续接手请先读 [game 总控书](GAME_CONTROL_BOOK.md)，试玩与素材替换见 [game/README.md](game/README.md)。

日语配音编辑器的范围、开发分期与 Sol/Terra 实现任务见 [VOICEVOX 配音项目总控书](VOICEVOX_CONTROL_BOOK.md)（游戏保留中文字幕）。P1-P5 编辑器工作包已完成；P6 游戏语音播放也已完成，见 [P6 报告](docs/voicevox/reports/P6.md)。

## 启动

正式小游戏统一位于 `game/minigames/`（节拍摄影、XP 电脑、七幕 Boss），最终章使用 `game/minigames/boss/final-release/` 的完整谱面版本；共享弹幕引擎位于 `game/src/engines/danmu.js`，同时提供红心生存与蓝心跳跃教学。公共立绘、字体只保留一份。重复导入包、旧地图试玩、独立课程网站和水族馆原型已移除，清理明细见 `outputs/cleanup-manifest.json`。`npm test` 同时运行主线和 Boss 的回归测试。

在本文件所在的仓库根目录执行：

```powershell
npm start
```

命令会启动本地服务器并打开仓库根目录的唯一游戏入口，再进入登录 → 开场 → 正式游戏流程。也可以使用等价命令：

```powershell
npm run game
```

默认从 `8080` 端口开始；如果端口已被占用，启动器会自动尝试 `8081`、`8082` 等端口，并在终端打印最终地址。浏览器没有自动打开时，复制终端中实际打印的地址访问。按 `Ctrl+C` 停止服务器。

只启动、不自动打开浏览器：`npm start -- --no-open`。指定起始端口：`npm start -- --port 9000 --no-open`。

没有 Node.js 时，也可以直接双击仓库根目录的 `index.html`，按同一条“登录 → 开场 → 正式游戏”流程试玩。此模式使用随页面加载的内嵌地图数据，不需要本地服务器；但浏览器会把 `file:` 存档与 HTTP 存档分开，剧本保存、图片上传和 VOICEVOX 等需要本机 API 的功能仍须使用 `npm start`。

需要直接调试章节并使用剧本编辑器时，运行：

```powershell
npm run chapters
```

它会在同一个本地服务器上直接打开章节索引（`/game/chapters.html`），不会经过登录页。请使用终端打印的 HTTP 地址进入，不要从文件管理器双击 `game/chapters.html`；端口被占用时，以终端打印的实际端口为准。

## VOICEVOX 配音工具

**T1、P1-P6 技术验收通过（2026-09-17）。** 最终检查、修复与生产边界见 [全项目验收报告](docs/voicevox/reports/FINAL_ACCEPTANCE.md)。 5,000 条工作表与工程往返、批量故障恢复、导入边界、声音映射丢失、端口与路径约束、完整游戏回归及少量真实引擎抽样结果见 [P5 阶段报告](docs/voicevox/reports/P5.md)。人工听感与所用音声库许可仍须在正式制作时逐项确认。

配音编辑器是独立入口，不会修改游戏中文字幕或 `script-edits.js`。启动本地服务后打开：

```powershell
npm start -- --no-open
# 浏览器访问 http://127.0.0.1:8080/game/voicevox-editor.html
```

编辑器会从当前已发布剧本生成有效台词列表，支持按 UTF-8、Shift-JIS 或 GB18030 解码并事务式导入多份 TXT、TSV、CSV 或 JSON，保留 `displayText` 与 `speechText` 两套文本；VOICEVOX Engine 需由用户在本机启动并监听 `127.0.0.1:50021`。工程保存到 `game/data/voice/voicevox-project.json`，上一版本保存在 `.bak`。批量队列 journal 与合成缓存位于 `game/data/voice/`，普通导出写入 `game/assets/audio/voices/generated/`。同步游戏台词会先预览新增、修改、删除、角色和分类变化，保留人工日语与调音并将受影响音频标记过期；正式发布写入稳定 ID WAV 和 `game/data/voice/voice-manifest.js`。旁白默认排除，可逐句显式纳入。游戏已接入 P6：发布后刷新游戏即可使用配音，菜单提供独立语音开关与音量；缺失或过期音频降级为无声。

角色日语稿制作使用独立的 T1 工具。它从六篇当前有效剧情和已发布 `script-edits` 导出总表及按角色 TSV，并严格按稳定 ID 回导：

```powershell
npm run voice:translations -- export
npm run voice:translations -- import game/data/voice/translations/export
npm run voice:translations -- export-ready
```

完整启动、导入、调音、备份恢复与故障处理见 [VOICEVOX 快速开始](docs/voicevox/QUICK_START.md)；翻译字段、分批回导和源文变更处理见 [T1 台词翻译工作流](docs/voicevox/T1_TRANSLATION_WORKFLOW.md)。
