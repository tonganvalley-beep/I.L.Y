// 零依赖开发服务器：仅绑定本机；从项目根目录提供静态文件。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.mp4':'video/mp4'};
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'sign&log/login.html' : pathname.replace(/^\/+/, '');
    const filename = path.resolve(root, relative);
    const inside = path.relative(root, filename);
    if (inside.startsWith('..') || path.isAbsolute(inside) || inside.split(/[\\/]/).some(part => part.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const content = await readFile(filename);
    response.writeHead(200, {'Content-Type':mime[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-store'}); response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(8080, '127.0.0.1', () => console.log('I.L.Y: http://127.0.0.1:8080'));
