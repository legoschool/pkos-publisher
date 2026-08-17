import { createServer } from 'node:http';
import { readFile, stat, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
const 뿌리 = process.argv[2] || '.';
const 포트 = +(process.argv[3] || 8790);
const 형 = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.woff2':'font/woff2', '.woff':'font/woff' };
createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    let p = decodeURIComponent(u.pathname);
    /* 시험용: 폴더 목록 */
    if (p.startsWith('/__ls')) {
      const 대상 = join(뿌리, u.searchParams.get('p') || '.');
      const 목록 = (await readdir(대상, { withFileTypes:true })).map(e => ({ name:e.name, kind: e.isDirectory() ? 'directory' : 'file' }));
      res.writeHead(200, { 'content-type':'application/json' }); return res.end(JSON.stringify(목록));
    }
    /* 시험용: 파일 쓰기 */
    if (req.method === 'PUT') {
      const 조각 = []; for await (const c of req) 조각.push(c);
      const f = join(뿌리, p); await mkdir(dirname(f), { recursive:true }); await writeFile(f, Buffer.concat(조각));
      res.writeHead(200); return res.end('ok');
    }
    let f = join(뿌리, p);
    if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
    const 몸 = await readFile(f);
    res.writeHead(200, { 'content-type': 형[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store' });
    res.end(몸);
  } catch (e) { res.writeHead(404); res.end('404 ' + e.code); }
}).listen(포트, () => console.log('http://localhost:' + 포트 + '/'));
