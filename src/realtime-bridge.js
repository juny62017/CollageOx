const http = require('node:http');

const previousCreateServer = http.createServer.bind(http);
const streams = new Set();

function broadcast(kind, payload = {}) {
  const message = `event: ${kind}\ndata: ${JSON.stringify({ kind, ...payload })}\n\n`;
  for (const stream of streams) {
    try { stream.write(message); }
    catch { streams.delete(stream); }
  }
}

function mutationEvents(req, res) {
  if (res.statusCode < 200 || res.statusCode >= 300) return;
  let pathname;
  try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; }
  catch { return; }
  const method = req.method;
  const events = [];

  if (pathname === '/api/profile' && method === 'PATCH') events.push(['profile', {}]);
  else if (pathname === '/api/posts' && method === 'POST') events.push(['post', {}]);
  else if (/^\/api\/posts\/[^/]+$/.test(pathname) && method === 'PATCH') events.push(['post', {}]);
  else if (/^\/api\/posts\/[^/]+$/.test(pathname) && method === 'DELETE') events.push(['deletePost', {}]);
  else if (/^\/api\/posts\/[^/]+\/react$/.test(pathname) && method === 'POST') events.push(['reaction', {}]);
  else if (/^\/api\/posts\/[^/]+\/comments$/.test(pathname) && method === 'POST') events.push(['comment', {}]);
  else if (/^\/api\/users\/[^/]+\/follow$/.test(pathname) && method === 'POST') events.push(['follow', {}]);
  else if (pathname === '/api/projects' && method === 'POST') events.push(['project', {}]);
  else if (/^\/api\/projects\/[^/]+(?:\/join|\/transfer)?$/.test(pathname) && ['POST', 'PATCH'].includes(method)) events.push(['project', {}]);
  else if (pathname === '/api/clubs' && method === 'POST') events.push(['club', {}]);
  else if (/^\/api\/clubs\/[^/]+(?:\/join|\/transfer)?$/.test(pathname) && ['POST', 'PATCH'].includes(method)) events.push(['club', {}]);
  else {
    const clubMessage = pathname.match(/^\/api\/clubs\/([^/]+)\/messages$/);
    if (clubMessage && method === 'POST') events.push(['clubMessage', { clubId: clubMessage[1] }]);
  }

  if (pathname === '/api/events' && method === 'POST') events.push(['event', {}]);
  else if (/^\/api\/events\/[^/]+(?:\/rsvp)?$/.test(pathname) && ['POST', 'PATCH', 'DELETE'].includes(method)) events.push(['event', {}]);

  if (pathname === '/api/announcements' && method === 'POST') events.push(['announcement', {}]);
  if (pathname === '/api/issues' && method === 'POST') events.push(['issue', {}]);
  else if (/^\/api\/issues\/[^/]+$/.test(pathname) && method === 'PATCH') events.push(['issue', {}]);
  else if (/^\/api\/issues\/[^/]+\/messages$/.test(pathname) && method === 'POST') events.push(['issue', {}]);

  if (/^\/api\/admin\/users\/[^/]+\/role$/.test(pathname) && method === 'PATCH') events.push(['profile', {}]);
  if (pathname === '/api/account' && method === 'DELETE') {
    events.push(['profile', {}], ['post', {}], ['project', {}], ['club', {}], ['event', {}]);
  }

  for (const [kind, payload] of events) broadcast(kind, payload);
}

http.createServer = function realtimeCreateServer(options, listener) {
  if (typeof options === 'function') {
    listener = options;
    options = undefined;
  }

  const wrapped = (req, res) => {
    let pathname = '';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}

    if (req.method === 'GET' && pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write('event: ready\ndata: {"ok":true}\n\n');
      streams.add(res);
      const ping = setInterval(() => {
        try { res.write(': ping\n\n'); }
        catch { clearInterval(ping); streams.delete(res); }
      }, 25000);
      req.on('close', () => {
        clearInterval(ping);
        streams.delete(res);
      });
      return;
    }

    res.once('finish', () => mutationEvents(req, res));
    return listener(req, res);
  };

  return options === undefined ? previousCreateServer(wrapped) : previousCreateServer(options, wrapped);
};

module.exports = { broadcast, streams, mutationEvents };
