import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { connect, createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const publicPort = 4200;
const angularPort = 4201;
const origin = `https://localhost:${publicPort}`;

const redirect = createHttpServer((request, response) => {
  const path = request.url?.startsWith('/') ? request.url : '/';
  response.writeHead(307, { Location: origin + path, Connection: 'close' });
  response.end();
});

// A TLS ClientHello starts with a handshake record. Pass TLS through to Angular
// so it keeps serving the trusted certificate and handling HMR WebSockets.
const listener = createServer((socket) => {
  socket.on('error', () => socket.destroy());
  socket.once('data', (chunk) => {
    if (chunk[0] !== 22) {
      socket.pause();
      socket.unshift(chunk);
      redirect.emit('connection', socket);
      socket.resume();
      return;
    }

    const upstream = connect(angularPort, host);
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
    upstream.write(chunk);
    socket.pipe(upstream).pipe(socket);
  });
});

let angular;
listener.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
listener.listen(publicPort, host, () => {
  console.log(`Local app: ${origin}/ (HTTP redirects to HTTPS)`);
  angular = spawn(process.execPath, [
    fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url)),
    'serve', ...process.argv.slice(2),
    '--host', host, '--port', String(angularPort), '--ssl',
    '--ssl-cert', '.angular/localhost-ssl/localhost.pem',
    '--ssl-key', '.angular/localhost-ssl/localhost.key',
  ], { stdio: 'inherit' });
  angular.on('error', (error) => {
    console.error(error.message);
    listener.close();
    process.exitCode = 1;
  });
  angular.on('exit', (code) => {
    listener.close();
    process.exitCode = code ?? 0;
  });
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    listener.close();
    angular?.kill();
  });
}
