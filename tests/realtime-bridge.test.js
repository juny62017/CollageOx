const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

require('../src/realtime-bridge');
require('../src/static-enhancements');

let server;
let base;

test.before(async () => {
  server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/posts/post_1/react') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"error":"not found"}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('enhanced shell keeps CSP and loads the live-route refresh fix', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
  const html = await response.text();
  assert.match(html, /enhancements\.js\?v=1/);
  assert.match(html, /pr6-route-fixes\.js\?v=1/);
});

test('successful intercepted mutations still emit realtime events', async () => {
  const controller = new AbortController();
  const response = await fetch(`${base}/api/stream`, { signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  const eventPromise = (async () => {
    let text = '';
    while (!text.includes('event: reaction')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text;
  })();

  const mutation = await fetch(`${base}/api/posts/post_1/react`, { method: 'POST' });
  assert.equal(mutation.status, 200);

  const eventText = await Promise.race([
    eventPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('realtime event timeout')), 1500))
  ]);
  assert.match(eventText, /event: reaction/);

  controller.abort();
  try { await reader.cancel(); } catch {}
});
