import zlib from 'node:zlib';

// Dev-server proxy for `npm run start:prod-api`: the browser talks only to
// https://localhost:4200 and these paths are forwarded to the production API,
// which does not allow localhost through CORS.
const target = 'https://api.mniassist.com';
const local = 'https://localhost:4200';

const forward = { target, secure: true, changeOrigin: true, ws: true };

export default {
  // Discovery lists absolute production endpoints; point them back at the proxy.
  '/.well-known': {
    ...forward,
    selfHandleResponse: true,
    configure: (proxy) => {
      // Ask for plain text: the browser sends gzip/br, which the rewrite below can't read.
      proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('accept-encoding', 'identity'));
      proxy.on('proxyRes', (proxyRes, _req, res) => {
        const chunks = [];
        proxyRes.on('data', (c) => chunks.push(c));
        proxyRes.on('end', () => {
          const raw = Buffer.concat(chunks);
          const enc = proxyRes.headers['content-encoding'];
          const plain =
            enc === 'br' ? zlib.brotliDecompressSync(raw)
            : enc === 'gzip' ? zlib.gunzipSync(raw)
            : enc === 'deflate' ? zlib.inflateSync(raw)
            : raw;
          const body = plain.toString('utf8').split(target).join(local);
          res.writeHead(proxyRes.statusCode ?? 200, { 'content-type': 'application/json' });
          res.end(body);
        });
      });
    },
  },
  '/connect': forward,
  '/api': forward,
  '/signalr-hubs': forward,
  '/hubs': forward,
};
