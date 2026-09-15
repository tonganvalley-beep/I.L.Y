# I.L.Y. 主游戏「缺少 UI」统计审计

> 范围：I.L.Y 主游戏（`game/` 目录及根入口）。
> 审计日期：2026-09-15
> 方法：解析 `game/data/assets.js`、`chapter-assets.js`、`map-assets.js` 全部资源 ID，与 `game/assets/` 磁盘文件逐一比对；检索 `game/src` 与 `game/data/story` 确认功能接线与节点类型分布（共 1267 个剧情节点）。

---

## 一、统计总览

| 类别 | 缺口数 | 说明 |
| --- | --- | --- |
| **A. 缺图 / 素材占位（图片）** | **22** | 15 个指向占位 SVG + 7 个空路径 |
| **A. 缺音频（文件）** | **20** | 5 BGM + 9 SFX + 6 配音，磁盘上完全无文件 |
| **B. 功能有代码/数据但无 UI 入口 / 未接线** | **9 类** | 见第二节 |
| **C. 反向：磁盘有素材但未登记（孤儿素材）** | **6** | 已放图但无资源 ID，等于没有 UI 入口 |

> 注意：音频（20 个）兼具「文件缺失」与「播放未接线」双重缺口，在 A、B 中分别计入。

---

## 二、A 类：缺图 / 素材缺口（图片 22 个）

### A-1. 指向占位 SVG（15 个）
游戏内会显示占位图，画面结构在但无正式美术。

**序章（5）**
- `portrait-kio-young`（高中基生回忆立绘）
- `kio-walk`（隧道横版步行精灵）
- `rent-sign`（空壳公寓招租牌）
- `trash-bag`（垃圾袋）
- `title-ily`（终幕 I.L.Y. 标题）

**第一章（10）**
- 背景占位：`ch1-street`、`ch1-panorama`、`ch1-empty-tank`、`ch1-cg-blue`、`ch1-cg-mirror`、`ch1-cg-bathroom`、`ch1-cg-collapse`、`ch1-cg-reflection`
- 角色占位：`ch1-toya`、`ch1-rui`

### A-2. 空路径（7 个，完全无图）
这些 ID 路径为 `''`，加载失败回退占位图，第一章实际游玩时会露出占位。
- `ch1-tile-floor`（地面贴图）
- `ch1-tile-wall`（墙面贴图）
- `ch1-sprite-airi`（爱理步行精灵）
- `ch1-object-desk`（课桌）
- `ch1-object-shelf`（书架）
- `ch1-object-bed`（床）
- `ch1-object-tank`（水族箱）

### A-3. 音频文件全部缺失（20 个）
`game/assets/audio/{bgm,sfx,voices}/` 目录下仅有 `.gitkeep`，无任何 mp3/wav/ogg。
- **BGM（5）**：`bgm-dusk`、`bgm-university`、`bgm-coast`、`bgm-blue`、`bgm-silent`
- **SFX（9）**：`sfx-fan`、`sfx-keypad`、`sfx-ringtone`、`sfx-busy`、`sfx-knock`、`sfx-doorlock`、`sfx-waves`、`sfx-blue`、`sfx-reveal`
- **配音（6）**：`vo-kio`、`vo-airi`、`vo-boss`、`vo-courier`、`vo-father`、`vo-system`

### C. 反向孤儿素材（6 个，已放图但未登记）
磁盘存在但不在任何资源清单中，因此游戏内**无法通过 ID 引用** → 等同于「没有 UI 入口」。
- `backgrounds/8_海岸_静.png`
- `backgrounds/15 出租屋俯视图.png`
- `characters/c7596c25ab4509f4b7963367a0c2474a.png`
- `characters/8f8d565ceba7e776c9917f708ce46742.png`
- `maps/room-rpg-pixel.png`
- `ui/phone-frame.png`

---

## 三、B 类：功能有代码/数据但无 UI 入口 / 未接线（9 类）

| # | 缺口 | 证据 | 现状 |
| --- | --- | --- | --- |
| 1 | **探索模式 `exploration`（格子探索）** | 全 1267 节点中 `type:"exploration"` 出现 **0 次**；引擎 `mountExploration` 与 `data/maps/classroom.js` 存在但未接入 | 模块保留，正常流程不可达 |
| 2 | **章节 2 / 3 / 最终章无流程内入口** | `prologue.js`+`chapter1.js` 的 `next`/`choices` 中**无任何 `ch2_`/`final_` 引用**；仅 `main.js:373` 的 `?chapter=N` URL 参数可直达 | 无章节选择 / 自动续接 UI |
| 3 | **BGM 自动播放未触发** | 剧情节点中 `bgm:` 字段出现 **0 次**（`game/data/story` 全量检索）；`Assets.setMusic` 已实现但无节点调用 | 机制就绪，游戏内不切歌 |
| 4 | **SFX 音效未接线** | `game/src` 中无 `playSfx` 调用；`assets.js` 注释明示「sfx 仅登记路径，代码未接线播放」 | 9 个音效 ID 无播放 |
| 5 | **配音 voices 未接线** | `game/src` 中无 `playVoice` 调用；6 个配音目录仅登记 | 无配音播放 |
| 6 | **自动 / 快进 / 对白历史** | 检索仅命中 autosave、自动完成探索、自动演出；无 `快进`/`fastForward`/`对白历史` 实现 | 未实现 |
| 7 | **特效与高级演出** | 仅 `walk.js` 隧道尾段淡入 + `phone.js` 拖动过渡；无通用淡入淡出 / 闪白 / 镜头 / 角色表情动画 / CG 鉴赏 | 未完成 |
| 8 | **存档导入 / 导出 / 云同步** | 控制书实现状态表标 P2；当前仅本地多槽存档 | 未实现 |
| 9 | **正式鉴权 / 桌面封装 / 新章节** | 控制书明确「未完成」；登录为账号分区而非正式鉴权 | 未完成 |

> 已确认**不是**缺口（已接线、不计入）：`battle`（第一章 `ch1_battle`/ch1-tutorial 弹幕教学已接入）、`search`/`fracture`/`letter`（由 `modes/chapter-moments.js` 渲染）、`phone`/`walk`/`corridor`/`rpg`/`boss`（均已在 `main.js` 挂载）。

---

## 四、按优先级建议

**P0（画面直接露怯，先补）**
- 替换 A-1 的 15 个占位 SVG 为正式图（尤其 `title-ily`、第一章 8 张 CG/背景占位）。
- 补全 A-2 的 7 个空路径素材（第一章家具/贴图/爱理步行精灵）。

**P1（音频与表现）**
- 放入 20 个音频文件（A-3），并接线 SFX/配音播放（B-4、B-5）。
- 在剧情节点配置 `bgm:` 字段以触发 BGM（B-3）。
- 实现自动/快进/对白历史（B-6）与基础特效（B-7）。

**P2（结构性与后续）**
- 为章节 2/3/最终章补流程内导航 UI（B-2），接入探索模式或明确弃用（B-1）。
- 存档导入导出/云同步（B-8）、正式鉴权/桌面封装（B-9）。
- 清理 C 类孤儿素材（登记或删除）。

---

## 五、审计脚本（可复跑）
- `tools/_audit_assets.cjs`：解析资源清单并与磁盘比对，输出占位/空路径/缺失文件清单与计数。
- `tools/_audit_types.cjs`：统计全剧情节点类型分布与各章链接情况。
