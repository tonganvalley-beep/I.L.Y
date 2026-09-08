# I.L.Y. RPG 地图方案 Demo 使用说明

入口：`game/rpg-demo/index.html`。推荐在仓库根目录执行下面的命令，它会启动本地服务器并自动打开 Demo：

```powershell
npm run demo
```

也可以执行 `npm start`，它同样会直接打开免登录 Demo。默认地址为：

```text
http://127.0.0.1:8080/game/rpg-demo/index.html
```

如果 `8080` 已被占用，启动器会自动改用后续可用端口，请以终端打印的地址为准。方案一不读取外部数据，双击 HTML 也能运行；方案二使用真正的 `map-demo.json`，浏览器会限制 `file:` 页面读取 JSON，所以必须通过本地服务器打开。

## 方案一：背景贴图 + 空气墙 + 交互点

核心配置在 `rpg-demo.js` 的 `photoScene`：

```js
const photoScene = {
  background: '../assets/images/backgrounds/5.走廊·开灯.png',
  player: { spawn: {x: 208, y: 578}, /* 人物图片见下文 */ },
  blockers: [
    {name: '上方墙面', x: 0, y: 0, width: 1280, height: 432}
  ],
  hotspots: [
    {id: 'lamp', name: '声控灯', x: 358, y: 474, radius: 78, text: '调查文本'}
  ]
};
```

场景图插入步骤：

1. 把完整场景图放进 `game/assets/images/backgrounds/`。推荐 16:9、1920×1080，重要物件不要贴画面边缘。
2. 把 `background` 改成相对 `game/rpg-demo/index.html` 的路径，例如 `../assets/images/backgrounds/my-room.webp`。
3. Demo 的设计坐标固定为 1280×720。点“显示碰撞区”，在 `blockers` 中调整红色矩形，直到人物脚底不能穿过墙、家具和画面边缘。
4. 在 `hotspots` 添加调查点。`x/y` 是中心坐标，`radius` 是可调查距离。交互点不是碰撞体；需要阻挡时还要补一个 blocker。

空气墙只检测人物脚底的绿色小矩形，而不是整张人物图。这样人物头部可以自然遮到桌面或墙边，不会因为透明图片太宽而提前撞墙。

这种方案适合：固定镜头、视觉小说中的短探索、每张背景构图独特的场景。优点是美术自由、落地快；缺点是每换一张图都要手工重画空气墙，地图无法自动复用。

## 方案二：JSON + 图块地图

地图内容在 `map-demo.json`，渲染和碰撞解释器在 `rpg-demo.js`。JSON 负责五类内容：

- `imageLayers`：整张场景图层，可作底图、远景或氛围叠图。
- `tileLayers`：用字符矩阵拼地板和墙。示例中 `.` 是地板，`#` 是不可走墙面。
- `tileset`：图块集图片。示例 SVG 横向包含 8 个 40×40 图块。
- `objects`：桌子、书架、门、信件等地图元素；可用图块，也可用独立图片。
- `player`：出生格、速度、人物尺寸和各方向图片。

### 插入整张场景图片

把图片放入素材目录，然后在 `imageLayers` 添加：

```json
{
  "name": "远景",
  "image": "../assets/images/backgrounds/my-room.webp",
  "opacity": 0.6,
  "fit": "cover"
}
```

它会先于图块绘制。若你已经有完整的俯视地图大图，可以让图块层只负责隐藏的碰撞逻辑；若图是纯远景，就在上面继续铺地板、墙和物件。

### 插入人物

人物图在 `player.images` 中配置：

```json
"images": {
  "front": "../../sign&log/photo&video/cursor-hero-front.png",
  "back": "../../sign&log/photo&video/cursor-hero-back.png",
  "left": ["left-1.png", "left-2.png"],
  "right": ["right-1.png", "right-2.png"]
}
```

单张字符串表示静止帧；数组表示走路动画帧。推荐透明 PNG/WebP，四方向画布尺寸一致、脚底处于同一基线。这个 Demo 显示为 48×48；原图可以更大，引擎会缩放。正式项目建议用 sprite sheet 时再增加 `frameWidth/frameHeight`，避免大量小文件。

### 制作图块集和地图元素

示例 `assets/demo-tileset.svg` 是 8 个图块横向排成的一张图：地板、墙、地毯、窗、桌、书架、门、盆栽。正式制作时可用 Aseprite、Photoshop、Krita 或 Tiled：

1. 先定统一网格，例如 32×32 或 48×48；不要在同一地图混用尺寸。
2. 把地板、墙角、门、窗等可重复元素按网格排进 PNG/WebP 图块集，关闭抗锯齿并保留透明背景。
3. 在 `legend` 里把地图字符映射到图块序号和 `solid`。图块序号从 0 开始，从左到右、从上到下计算。
4. 大件家具放在 `objects`。`x/y/width/height` 都以格为单位；`solid: true` 生成碰撞区。
5. 独立图片元素使用 `image`，例如信件：

```json
{
  "id": "letter",
  "name": "窗边的信",
  "image": "assets/letter.svg",
  "x": 10,
  "y": 4,
  "width": 1,
  "height": 1,
  "solid": false,
  "interaction": "信纸上的内容……"
}
```

6. 需要调查时添加 `interaction`；只装饰就不加。需要挡路时添加 `solid: true`。视觉、碰撞、交互是三个独立属性，不要把“看得见”误认为“自然会挡路”。

地图矩阵每一行必须等于 `width`，行数必须等于 `height`。Demo 加载时会校验尺寸，写错会直接提示具体图层。

## 怎么选

| 对比 | 背景贴图方案 | JSON 图块方案 |
| --- | --- | --- |
| 美术表现 | 最自由，直接使用完整原画 | 风格统一，重复图块明显 |
| 制作速度 | 单张地图快 | 前期做图块集慢，后续地图快 |
| 碰撞 | 每张图手调矩形 | 墙图块和 solid 物件自动生成 |
| 修改地图 | 图和坐标经常要一起重做 | 改 JSON / 编辑器数据即可 |
| 适用规模 | 少量固定镜头、剧情探索 | 多房间、迷宫、可复用关卡 |

对 I.L.Y. 的建议是混合使用：主线 Galgame 和少量氛围探索用方案一；需要反复移动、搜证、开门和切房间的章节用方案二。二者共用同一套人物图片、交互文本和状态系统，不需要选定一种后把另一种彻底删除。
