# I.L.Y.

游戏改造与后续接手请先读 [game 总控书](GAME_CONTROL_BOOK.md)，试玩与素材替换见 [game/README.md](game/README.md)。

## 启动

在本文件所在的仓库根目录执行：

```powershell
npm start
```

命令会启动本地服务器并直接打开无需登录、无需注册的 RPG 地图方案 Demo。也可以使用等价命令：

```powershell
npm run demo
```

原来的登录 → 开场 → 正式游戏入口仍然保留，需要时执行：

```powershell
npm run game
```

默认从 `8080` 端口开始；如果端口已被占用，启动器会自动尝试 `8081`、`8082` 等端口，并在终端打印最终地址。直接访问终端中的“默认入口”或 `http://127.0.0.1:实际端口/` 都会进入免登录 Demo。浏览器没有自动打开时，复制终端中实际打印的地址访问。按 `Ctrl+C` 停止服务器。

只启动、不自动打开浏览器：`npm start -- --no-open`。指定起始端口：`npm start -- --port 9000 --no-open`。
