# I.L.Y.

游戏改造与后续接手请先读 [game 总控书](GAME_CONTROL_BOOK.md)，试玩与素材替换见 [game/README.md](game/README.md)。

## 启动

正式小游戏统一位于 `game/minigames/`（节拍摄影、XP 电脑、七幕 Boss），红心弹幕共享引擎位于 `game/src/engines/danmu.js`。公共立绘、字体只保留一份。重复导入包、旧地图试玩、独立课程网站和水族馆原型已移除，清理明细见 `outputs/cleanup-manifest.json`。`npm test` 同时运行主线和 Boss 的回归测试。

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
