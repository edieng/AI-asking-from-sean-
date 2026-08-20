// Test: start the server on a random port, send GET /, assert 200.
const net = require('node:net');
const assert = require('node:assert');

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
  await new Promise((r) => setTimeout(r, 150));
  const res = await fetch(`http://localhost:${port}/`);
  assert.strictEqual(res.status, 200);
  res.destroy();
  console.log('test passed: GET / returned 200');
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
