# 素材清单

这里集中保存“资源 ID → 实际文件路径”的清单，并按剧情章节或用途分块。

章节归档表示素材首次引入或主要维护的位置，不表示只能被该章使用。游戏会按顺序加载全部分块；后续章节复用已有资源 ID 时不要重复登记。

- `prologue.js`：初始化素材系统，登记序章基础背景、人物、道具与音频；后续章节可以复用这些通用 ID。
- `chapter1.js`：第一章新增素材。
- `chapter2.js`：第二章新增素材，由章节生成器维护。
- `chapter3.js`：第三章新增素材，由章节生成器维护。
- `final.js`：最终章新增素材；目前最终章复用序章和前面章节已有的素材。
- `maps.js`：各章 RPG 地图背景，由地图生成器维护。

真正的 PNG、JPG、SVG、MP3 等文件仍统一放在 `game/assets/`，按照 `images/backgrounds`、`images/characters`、`images/cg`、`images/maps`、`audio` 等类型存放。

加载时必须先执行 `prologue.js`，再加载其他分块。替换已有素材时只改路径，不要改资源 ID。
