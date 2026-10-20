const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('Billsplitter.html');
const version = app.match(/appVersion: '([^']+)'/)[1];
assert.equal(version, 'v2.1.0');
assert.ok(app.includes(`<title>BillSpliter (Badtz.mos) ${version}</title>`));
assert.ok(read('index.html').includes("window.location.replace('./Billsplitter.html')"));
assert.equal(JSON.parse(read('manifest.webmanifest')).start_url, './Billsplitter.html');
assert.match(read('netlify.toml'), /\[build\]\s+ignore\s*=\s*"exit 0"/);
const handlers = {}, deleted = [], cached = [];
let skipped = false, claimed = false;
const current = 'billspliter-v2-1-0';
const context = {
  self: {
    addEventListener: (event, handler) => { handlers[event] = handler; },
    skipWaiting: async () => { skipped = true; },
    clients: { claim: async () => { claimed = true; } }
  },
  caches: {
    open: async name => {
      assert.equal(name, current);
      return { addAll: async urls => {
        for (const url of urls) {
          const relative = url.replace(/^\.\//, '') || 'index.html';
          const parent = path.dirname(relative);
          assert.ok(fs.readdirSync(path.join(root, parent)).includes(path.basename(relative)), `Exact-case app shell file exists: ${relative}`);
        }
        cached.push(...urls);
      } };
    },
    keys: async () => ['billspliter-v2-0-1', current, 'another-app-cache'],
    delete: async name => { deleted.push(name); }
  }
};
vm.runInNewContext(read('sw.js'), context);
(async () => {
  let pending;
  handlers.install({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.ok(cached.includes('./Billsplitter.html'));
  assert.ok(skipped);
  handlers.activate({ waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(deleted, ['billspliter-v2-0-1']);
  assert.ok(claimed);
  console.log(`PASS release ${version}: entry points, exact-case cache installation and scoped cache upgrade`);
})().catch(error => { console.error(error); process.exitCode = 1; });
