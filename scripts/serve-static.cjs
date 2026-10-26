// A tiny static file server: node scripts/serve-static.cjs <folder> <port>
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

http
  .createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const file = path.join(root, path.normalize(decodeURIComponent(url.pathname)));
    const target =
      file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()
        ? file
        : path.join(root, 'index.html');
    response.writeHead(200, {
      'Content-Type': types[path.extname(target)] || 'application/octet-stream',
    });
    fs.createReadStream(target).pipe(response);
  })
  .listen(port, '127.0.0.1', () => console.log(`Serving ${root} on http://127.0.0.1:${port}`));
