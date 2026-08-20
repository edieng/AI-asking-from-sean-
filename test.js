// Test: start the server on a random port, send GET /, assert 200.
const net = require('node:net');
const http = require('node:http');
const assert = require('node:assert');

// Capture the server instance so it can be closed cleanly before exit.
let capturedServer = null;
const origListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  capturedServer = this;
  return origListen.apply(this, args);
};

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function main() {
  const port = await getFreePort();
  process.env.PORT = String(port);
  require('./server.js');
  await new Promise((r) => setTimeout(r, 200));
  const res = await fetch(`http://localhost:${port}/`);
  assert.strictEqual(res.status, 200);
  await res.body.cancel();
  // Close the server and let the event loop drain so the process exits cleanly.
  capturedServer.close();
  console.log('test passed: GET / returned 200');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
