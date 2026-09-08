// 零依赖开发服务器：仅绑定本机，自动避开被占用的端口，可选打开浏览器。
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = '127.0.0.1';
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const requestedPort = portFlag >= 0 ? Number.parseInt(args[portFlag + 1], 10) : 8080;
const openFlag = args.indexOf('--open');
const shouldOpen = openFlag >= 0 && !args.includes('--no-open');
const openPath = openFlag >= 0 && args[openFlag + 1] && !args[openFlag + 1].startsWith('--') ? args[openFlag + 1] : '/';

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error('端口无效。请使用 --port 8080 这样的参数。');
  process.exit(1);
}

const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.ttf':'font/ttf', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.mp4':'video/mp4'
};

function safeFilename(relative) {
  const filename = path.resolve(root, relative);
  const inside = path.relative(root, filename);
  if (inside.startsWith('..') || path.isAbsolute(inside) || inside.split(/[\\/]/).some(part => part.startsWith('.'))) return null;
  return filename;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}`);
    const pathname = decodeURIComponent(url.pathname);
    // 开发默认入口是无需账号的 RPG Demo。使用跳转而不是内部代替文件，
    // 让浏览器以正确目录解析 Demo 的 CSS、脚本、JSON 和图片相对路径。
    if (pathname === '/') {
      response.writeHead(302, {'Location':'/game/rpg-demo/index.html', 'Cache-Control':'no-store'});
      response.end();
      return;
    }
    let relative = pathname.replace(/^\/+/, '');
    if (pathname.endsWith('/')) relative += 'index.html';
    const filename = safeFilename(relative);
    if (!filename) { response.writeHead(403); response.end('Forbidden'); return; }
    const content = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(content);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('Not found');
  }
});

function openBrowser(url) {
  let command, browserArgs;
  if (process.platform === 'win32') {
    command = 'rundll32.exe'; browserArgs = ['url.dll,FileProtocolHandler', url];
  } else if (process.platform === 'darwin') {
    command = 'open'; browserArgs = [url];
  } else {
    command = 'xdg-open'; browserArgs = [url];
  }
  const child = spawn(command, browserArgs, {detached: true, stdio: 'ignore'});
  child.on('error', () => console.warn(`浏览器未能自动打开，请手动访问：${url}`));
  child.unref();
}

function listen(port, attempts = 0) {
  const ready = () => {
    server.removeListener('error', retry);
    const base = `http://${host}:${port}`;
    const target = new URL(openPath, `${base}/`).href;
    console.log(`默认入口（免登录 Demo）：${base}/`);
    console.log(`RPG Demo：${base}/game/rpg-demo/index.html`);
    console.log(`原登录入口：${base}/sign&log/login.html`);
    console.log('按 Ctrl+C 停止服务器。');
    if (shouldOpen) openBrowser(target);
  };
  const retry = error => {
    server.removeListener('listening', ready);
    if (error.code === 'EADDRINUSE' && attempts < 20 && port < 65535) {
      console.warn(`端口 ${port} 已被占用，正在尝试 ${port + 1}…`);
      listen(port + 1, attempts + 1);
      return;
    }
    console.error(`服务器启动失败：${error.message}`);
    process.exitCode = 1;
  };
  server.once('error', retry);
  server.once('listening', ready);
  server.listen(port, host);
}

listen(requestedPort);
