// Set NODE_PATH to external node_modules containing vue and jsdom, as in HANDOVER.md.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'Billsplitter.html'), 'utf8');
assert.ok(!/navigator\.(share|canShare)/.test(html), 'Native sharing APIs removed');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
let assertions = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); assertions++; };
const ok = (value, label) => { assert.ok(value, label); assertions++; };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function mount(options = {}) {
  const errors = [], calls = { renders: [], copies: [], downloads: [], urls: [], revoked: [], cleanups: [] };
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!e.message.includes('Could not parse CSS')) errors.push(e.message); });
  vc.on('warn', m => errors.push(String(m))); vc.on('error', m => errors.push(String(m)));
  const dom = new JSDOM(html, { url: 'https://billsplitter.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  Object.defineProperty(w, 'isSecureContext', { value: options.secure !== false, configurable: true });
  w.alert = () => {}; w.scrollTo = () => {};
  w.bootstrap = { Modal: class {
    constructor(el) { this.el = el; }
    show() { this.el.classList.add('show'); this.el.dispatchEvent(new w.Event('shown.bs.modal')); }
  }, Toast: class { show() {} } };
  const timers = w.setTimeout.bind(w);
  w.setTimeout = (callback, delay, ...args) => {
    if (delay === 1000) { calls.cleanups.push(callback); return 0; }
    return timers(callback, delay, ...args);
  };
  w.URL.createObjectURL = blob => { calls.urls.push(blob); return 'blob:test-' + calls.urls.length; };
  w.URL.revokeObjectURL = url => calls.revoked.push(url);
  w.HTMLAnchorElement.prototype.click = function () { calls.downloads.push({ name: this.download, href: this.href }); };
  if (options.clipboard !== false) {
    w.ClipboardItem = class {
      constructor(data) { this.data = data; }
      static supports(type) { return type === 'image/png' && options.copyPng !== false; }
    };
    Object.defineProperty(w.navigator, 'clipboard', { value: { write: items => {
      calls.copies.push(items);
      return options.copy ? options.copy(items) : Promise.resolve();
    } }, configurable: true });
  }
  const canvas = (settings = {}) => ({ toBlob(callback, type, quality) {
    if (settings.throw) throw new Error('Canvas is tainted');
    calls.lastMime = type; calls.lastQuality = quality;
    callback(settings.empty ? null : new w.Blob(['mock-image-bytes'], { type }));
  } });
  w.html2canvas = (el, config) => {
    const clone = w.document.cloneNode(true);
    config.onclone(clone);
    calls.renders.push({ text: el.textContent, config, clone, liveTransform: el.style.transform });
    return options.render ? options.render(el, config, canvas) : Promise.resolve(canvas());
  };
  if (options.fonts) Object.defineProperty(w.document, 'fonts', { value: { ready: options.fonts } });
  if (options.decode) w.HTMLImageElement.prototype.decode = options.decode;
  w.eval(fs.readFileSync(require.resolve('vue/dist/vue.global.js'), 'utf8'));
  scripts.forEach(script => w.eval(script));
  const vm = w.document.querySelector('#app').__vue_app__._instance.proxy;
  const settle = async () => { await vm.$nextTick(); await new Promise(resolve => setImmediate(resolve)); await vm.$nextTick(); };
  const seed = async () => {
    vm.people = ['Alice', 'Bob']; vm.savedShops = ['Cafe']; vm.currentShop = 'Cafe'; vm.shopMemberMap = { Cafe: ['Alice', 'Bob'] };
    vm.expenses = [{ id: 1, shop: 'Cafe', item: 'Lunch', price: 100, payer: 'Alice', consumers: ['Alice', 'Bob'], customSplit: false, customAmounts: {} }];
    vm.payment = { type: 'bank', name: 'Alice', bankName: 'Example Bank', detail: '1234567890', qrImage: null };
    await settle();
  };
  const hide = () => {
    const modal = w.document.getElementById('summaryModal');
    modal.dispatchEvent(new w.Event('hide.bs.modal')); modal.classList.remove('show');
  };
  return { w, vm, calls, errors, canvas, settle, seed, hide, close: () => { calls.cleanups.forEach(fn => fn()); w.close(); } };
}
const scenarios = [
  ['Insecure contexts keep manual image saving available', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'unsupported'); equal(app.calls.renders.length, 0);
    ok(!app.w.document.getElementById('btnCopyReceipt'));
    await app.vm.captureReceipt('png'); equal(app.calls.downloads.length, 1);
  }, { secure: false }],
  ['Copy the full PNG during the click without saving', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'ready');
    equal(app.vm.receiptImageBlob.type, 'image/png'); ok(app.vm.receiptImageBlob.size > 0);
    for (const text of ['Lunch', 'Alice', 'Bob', 'Cafe', '1234567890']) ok(app.calls.renders[0].text.includes(text), 'Full receipt includes ' + text);
    equal(app.calls.renders[0].clone.getElementById('captureArea').style.transform, 'none');
    ok(!app.w.document.getElementById('btnShareReceipt'), 'Share button removed');
    const button = app.w.document.getElementById('btnCopyReceipt'); ok(button); ok(!button.disabled);
    button.click(); equal(app.calls.copies.length, 1, 'Clipboard write starts during click');
    equal(app.calls.copies[0][0].data['image/png'], app.vm.receiptImageBlob);
    await app.settle(); equal(app.vm.isCopyingReceipt, false); ok(app.vm.receiptFeedback.includes('คัดลอกรูปแล้ว'));
    equal(app.calls.downloads.length, 0); equal(app.calls.urls.length, 0);
    app.vm.expenses[0].price = 200; app.vm.copyReceipt(); equal(app.calls.copies.length, 1, 'Stale image is never copied');
    await app.settle(); button.click(); await app.settle(); equal(app.calls.copies.length, 2);
  }, { clipboard: true }],
  ['Clipboard permission failures can retry and duplicate copies are blocked', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    const pending = deferred(); app.w.navigator.clipboard.write = items => { app.calls.copies.push(items); return pending.promise; };
    app.vm.copyReceipt(); app.vm.copyReceipt(); equal(app.calls.copies.length, 1); equal(app.vm.isCopyingReceipt, true);
    pending.reject(new app.w.DOMException('Denied', 'NotAllowedError')); await app.settle();
    equal(app.vm.isCopyingReceipt, false); ok(app.vm.receiptFeedback.includes('คัดลอกรูปไม่ได้')); equal(app.calls.downloads.length, 0);
    app.w.navigator.clipboard.write = items => { app.calls.copies.push(items); return Promise.resolve(); };
    app.vm.copyReceipt(); await app.settle(); equal(app.calls.copies.length, 2); ok(app.vm.receiptFeedback.includes('คัดลอกรูปแล้ว'));
  }, { clipboard: true }],
  ['Unsupported clipboard PNG does not advertise copying', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'unsupported'); equal(app.calls.renders.length, 0);
    ok(!app.w.document.getElementById('btnCopyReceipt'));
  }, { clipboard: true, copyPng: false }],
  ['Synchronous clipboard errors recover and stale completion stays quiet', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'ready');
    app.w.navigator.clipboard.write = () => { throw new app.w.DOMException('Blocked', 'NotAllowedError'); };
    app.vm.copyReceipt(); equal(app.vm.isCopyingReceipt, false); ok(app.vm.receiptCopyMessage.includes('คัดลอกรูปไม่ได้'));
    const pending = deferred(); app.w.navigator.clipboard.write = items => { app.calls.copies.push(items); return pending.promise; };
    app.vm.copyReceipt(); app.vm.expenses[0].price = 250; await app.settle(); pending.resolve(); await app.settle();
    equal(app.vm.receiptCopyMessage, '', 'Old clipboard completion cannot claim the latest image was copied');
    equal(app.vm.isCopyingReceipt, false); equal(app.calls.downloads.length, 0);
  }, { clipboard: true }],
  ['Unsupported browser keeps manual PNG/JPG downloads', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'unsupported'); ok(app.vm.receiptFeedback.includes('บันทึกภาพ'));
    ok(!app.w.document.getElementById('btnCopyReceipt')); equal(app.calls.renders.length, 0); equal(app.calls.downloads.length, 0);
    app.vm.zoomLevel = 0.4; await app.settle();
    for (const [format, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png']]) {
      await app.vm.captureReceipt(format); equal(app.calls.lastMime, mime); equal(app.calls.urls.at(-1).type, mime);
      ok(app.calls.downloads.at(-1).name.endsWith('.' + format)); equal(app.vm.zoomLevel, 0.4); equal(app.vm.isSavingReceipt, false);
    }
    app.calls.cleanups.forEach(fn => fn()); app.calls.cleanups.length = 0;
    equal(app.calls.revoked.length, 2, 'Download object URLs released');
  }, { clipboard: false }],
  ['Rendering failure, empty blob and retry preserve zoom', async app => {
    await app.seed(); app.vm.openSummary(); await app.settle();
    equal(app.vm.receiptImageState, 'error'); equal(app.vm.isCopyingReceipt, false); ok(app.vm.receiptPreparationMessage.includes('เตรียมรูปไม่สำเร็จ'));
    app.vm.zoomLevel = 0.73;
    await app.vm.captureReceipt('png'); equal(app.vm.zoomLevel, 0.73); equal(app.vm.isSavingReceipt, false); equal(app.calls.downloads.length, 0);
    ok(app.vm.receiptExportMessage.includes('สร้างภาพไม่สำเร็จ'));
    app.w.html2canvas = () => Promise.resolve(app.canvas({ empty: true })); app.vm.refreshReceiptImage(); await app.settle(); equal(app.vm.receiptImageState, 'error');
    app.w.html2canvas = () => Promise.resolve(app.canvas({ throw: true })); app.vm.refreshReceiptImage(); await app.settle(); equal(app.vm.receiptImageState, 'error');
    app.w.html2canvas = () => Promise.resolve(app.canvas());
    [...app.w.document.querySelectorAll('.summary-image-control button')].find(el => el.textContent.includes('ลอง')).click(); await app.settle();
    equal(app.vm.receiptImageState, 'ready'); equal(app.vm.zoomLevel, 0.73);
  }, { render: () => Promise.reject(new Error('Rasterization failed')) }],
  ['Out-of-order renders and closing cannot restore stale files', async app => {
    await app.seed(); const jobs = [];
    app.w.html2canvas = () => { const job = deferred(); jobs.push(job); return job.promise; };
    app.vm.openSummary(); await app.settle(); equal(jobs.length, 1); equal(app.vm.receiptImageState, 'preparing');
    ok(app.w.document.getElementById('btnCopyReceipt').disabled); app.vm.copyReceipt(); equal(app.calls.copies.length, 0);
    app.vm.expenses[0].price = 200; await app.settle(); equal(jobs.length, 2);
    app.vm.zoomLevel = 0.56; jobs[1].resolve(app.canvas()); await app.settle(); const fresh = app.vm.receiptImageBlob;
    equal(app.vm.receiptImageState, 'ready'); jobs[0].resolve(app.canvas()); await app.settle(); equal(app.vm.receiptImageBlob, fresh);
    equal(app.vm.zoomLevel, 0.56, 'User zoom change survives async rendering');
    app.vm.payment.detail = '999'; await app.settle(); equal(jobs.length, 3);
    app.hide(); jobs[2].reject(new Error('Old capture failed')); await app.settle(); equal(app.vm.receiptImageBlob, null); equal(app.vm.receiptImageState, 'idle'); equal(app.vm.receiptPreparationMessage, '');
    app.vm.openSummary(); await app.settle(); equal(jobs.length, 4); jobs[3].resolve(app.canvas()); await app.settle(); equal(app.vm.receiptImageState, 'ready');
  }],
  ['Fonts and QR decode finish before capture', async app => {
    await app.seed(); app.vm.payment.type = 'qrcode'; app.vm.payment.qrImage = 'data:image/png;base64,aGVsbG8='; await app.settle();
    const fonts = deferred(), image = deferred(); let decoding = 0;
    Object.defineProperty(app.w.document, 'fonts', { value: { ready: fonts.promise }, configurable: true });
    app.w.HTMLImageElement.prototype.decode = () => { decoding++; return image.promise; };
    app.vm.openSummary(); await app.settle(); equal(app.calls.renders.length, 0); equal(decoding, 0);
    fonts.resolve(); await app.settle(); ok(decoding > 0); equal(app.calls.renders.length, 0);
    image.resolve(); await app.settle(); equal(app.calls.renders.length, 1); equal(app.vm.receiptImageState, 'ready');
  }],
  ['QR decode failure is retryable without downloading or changing zoom', async app => {
    await app.seed(); app.vm.payment.type = 'qrcode'; app.vm.payment.qrImage = 'data:image/png;base64,aGVsbG8=';
    app.w.HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Invalid QR image'));
    await app.settle(); app.vm.openSummary(); await app.settle(); equal(app.vm.receiptImageState, 'error'); equal(app.calls.renders.length, 0);
    app.vm.zoomLevel = 0.65; await app.vm.captureReceipt('jpg'); equal(app.vm.zoomLevel, 0.65); equal(app.calls.downloads.length, 0); equal(app.vm.isSavingReceipt, false);
    app.w.HTMLImageElement.prototype.decode = () => Promise.resolve();
    app.vm.refreshReceiptImage(); await app.settle(); equal(app.vm.receiptImageState, 'ready'); equal(app.vm.zoomLevel, 0.65);
  }],
];
(async () => {
  let failures = 0;
  for (const [name, run, options] of scenarios) {
    const app = mount(options);
    try { await run(app); await app.settle(); equal(app.errors.join('\n'), '', 'No Vue/runtime warnings'); console.log('PASS ' + name); }
    catch (error) { failures++; console.error('FAIL ' + name + '\n' + error.stack); }
    finally { app.close(); }
  }
  console.log(`${assertions} assertions; ${scenarios.length} copy scenarios; ${failures} failures (clipboard/rasterization mocked)`);
  process.exitCode = failures ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
