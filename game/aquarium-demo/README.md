# 潮汐回路 · 水族馆管道谜题 Demo

独立玩法原型，尚未接入主线。双击本目录 `index.html` 即可试玩，或在仓库根目录运行 `node tools/serve.mjs --open /game/aquarium-demo/index.html`。

四关依次增加过滤器、固定管道、岩石与干扰路线。点击顺时针旋转，右键或 Shift＋点击逆时针；Tab / Enter 可操作。开启水泵后逐格显示水流，泄漏位置标红。水必须从左侧入口到达右侧出口、经过全部过滤器，且水流所在回路没有开放接口。未连接的干扰管道不会导致漏水。

不计时，无试水次数限制。支持撤销、重置、自由选关和本地最佳步数。三星目标按预设解的最少双向旋转次数计算，不保证是所有可行路径的全局最优。三星为目标次数以内，二星为目标加五次以内，其余成功通关为一星。存储不可用时仍可玩。

`puzzle.js` 保存关卡和纯逻辑，`game.js` 负责交互，`style.css` 沿用项目 Zpix 字体。无需外部网络或依赖。

验证：`node --test tests/aquarium-puzzle.test.mjs`。浏览器验证使用 `tools/aquarium-demo-check.cjs`，先在 8096 端口运行仓库服务器，Playwright 可通过 `ILY_PLAYWRIGHT` 指定。覆盖四关点击通关、失败反馈、撤销、换关、键盘、390px 布局和本地文件预览。
