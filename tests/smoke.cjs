// Run with NODE_PATH pointing to an external node_modules containing jsdom and vue.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'Billsplitter.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
let assertions = 0;
const equal = (actual, expected, message) => { assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message); assertions++; };
const ok = (value, message) => { assert.ok(value, message); assertions++; };
function mount(storage = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', e => { if (!e.message.includes('Could not parse CSS')) errors.push(e.message); });
  console.on('warn', m => errors.push(String(m)));
  console.on('error', m => errors.push(String(m)));
  const dom = new JSDOM(html, { url: 'https://billsplitter.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window;
  Object.entries(storage).forEach(([key, value]) => w.localStorage.setItem(key, value));
  w.alert = () => {}; w.confirm = () => true; w.scrollTo = () => {};
  w.bootstrap = { Toast: class { show() {} }, Modal: class { show() {} hide() {} } };
  w.eval(fs.readFileSync(require.resolve('vue/dist/vue.global.js'), 'utf8'));
  scripts.forEach(script => w.eval(script));
  const vm = w.document.querySelector('#app').__vue_app__._instance.proxy;
  return { w, vm, errors, tick: () => vm.$nextTick(), close: () => w.close() };
}
function seed(vm) {
  for (const name of ['A', 'B']) { vm.newPerson = name; vm.addPerson(); }
  vm.setShopUiMode('add'); vm.newShopName = 'Cafe'; vm.createNewShop();
}
async function expense(vm, tick) {
  vm.resetForm(); vm.splitMode = 'equal'; vm.form.item = 'Meal'; vm.form.price = 100; vm.form.payer = 'A';
  await tick(); vm.saveExpense(); await tick(); return vm.expenses[0];
}
const scenarios = [
  ['CRUD, calculator keyboard/boundaries, persistence', async ({ vm, w, tick }) => {
    seed(vm); vm.leftPanelTab = 'manager'; await tick();
    equal(vm.people, ['A', 'B'], 'Members created'); equal(vm.activeShopMembers, ['A', 'B'], 'Shop initialized');
    const first = await expense(vm, tick); equal(vm.expenses.length, 1, 'Item created');
    equal(vm.summary.reduce((sum, member) => sum + member.net, 0), 0, 'Equal split balances');
    vm.openSummary(); await tick(); ok(w.document.querySelector('#summaryModal'), 'Summary modal content renders');
    vm.editExpense(first); vm.form.item = 'Updated'; vm.form.price = 125; await tick(); vm.saveExpense(); await tick();
    equal(vm.expenses[0].item, 'Updated', 'Item updated');
    vm.tempEditShopName = 'Renamed'; vm.saveCurrentShopEdits(); await tick();
    equal(vm.expenses[0].shop, 'Renamed', 'Shop rename follows saved items');
    vm.setShopUiMode('add'); vm.newShopName = 'Second'; vm.createNewShop(); vm.selectShopInline('Renamed'); await tick();
    equal(vm.currentShop, 'Renamed', 'Shop switched');
    const trigger = w.document.querySelector('.manager-price-calc'); trigger.focus(); trigger.click(); await tick();
    equal(vm.calculatorTarget.type, 'price', 'Calculator opens from price button');
    vm.calculatorExpression = '(120.50+35)/2'; await tick();
    w.document.querySelector('.custom-calc-display').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await tick();
    equal(vm.form.price, 77.75, 'Enter applies formula'); ok(w.document.activeElement === trigger, 'Focus restored');
    for (const formula of ['1/0', '2+', '-5', '9'.repeat(307)]) {
      vm.openPriceCalculator(); vm.calculatorExpression = formula; await tick(); ok(!vm.calculatorCanApply, 'Reject invalid result ' + formula.slice(0, 12));
      vm.applyCalculator(); equal(vm.form.price, 77.75, 'Invalid result leaves price unchanged');
      w.document.querySelector('.custom-calc-display').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
      equal(vm.calculatorTarget, null, 'Escape closes calculator');
    }
    vm.openPriceCalculator(); vm.clearCalc(); vm.appendCalc('12'); vm.appendCalc('+8'); vm.backspaceCalc(); vm.appendCalc('3'); vm.applyCalculator(); await tick();
    equal(vm.form.price, 15, 'Clear, append, backspace work');
    vm.form.price = 200; vm.splitMode = 'custom'; vm.customAmounts = { A: 0, B: 50 }; await tick();
    vm.openCustomCalculator('A'); vm.calculatorExpression = '999'; vm.applyCalculator(); await tick();
    equal(vm.customAmounts.A, 150, 'Amount calculator respects remainder');
    vm.setCustomInputMode('percent'); vm.openCustomCalculator('A'); vm.calculatorExpression = '100'; vm.applyCalculator(); await tick();
    equal(vm.customPercents.A, 75, 'Percent calculator respects remainder');
    vm.form.item = 'Shared'; vm.form.payer = 'A'; ok(vm.isFormValid, 'Custom split valid'); vm.saveExpense(); await tick();
    const storage = Object.fromEntries(Object.keys(w.localStorage).map(key => [key, w.localStorage.getItem(key)]));
    const reloaded = mount(storage);
    try { await reloaded.tick(); equal(reloaded.vm.getCleanData(), JSON.parse(storage.bill_v1_0_0), 'Reload preserves durable data'); equal(reloaded.errors, [], 'Reload without runtime errors'); }
    finally { reloaded.close(); }
    vm.removeExpense(vm.expenses[0].id); await tick(); equal(vm.expenses.length, 1, 'Delete selected item only');
    vm.shopManagerMode = 'editor'; vm.deleteShop(vm.savedShops.indexOf('Second')); equal(vm.savedShops.length, 2, 'Cannot delete inactive shop');
    vm.selectShopInline('Second'); vm.deleteShop(vm.savedShops.indexOf('Second')); await tick(); equal(vm.savedShops, ['Renamed'], 'Manager shop deletion');
  }],
  ['Cancel edit preserves saved consumers', async ({ vm, tick }) => {
    seed(vm); const original = await expense(vm, tick); original.consumers = ['A']; vm.editExpense(original); vm.toggleConsumer('B'); vm.cancelEdit(); await tick();
    equal(vm.expenses[0].consumers, ['A'], 'Cancelled edit cannot mutate saved consumers');
    vm.editExpense(vm.expenses[0]); vm.toggleConsumer('B'); vm.saveExpense(); await tick(); equal(vm.expenses[0].consumers, ['A', 'B'], 'Saved edit changes consumers');
  }],
  ['Delete edited item resets draft', async ({ vm, tick }) => {
    seed(vm); const original = await expense(vm, tick);
    seedNewShop(vm); vm.editExpense(original); vm.removeExpense(original.id); await tick();
    equal(vm.form.id, null, 'Deleted item cannot leave stale edit ID'); equal(vm.editingIndex, null, 'Editing mode reset');
    await expense(vm, tick); equal(vm.expenses.length, 1, 'Next item is stored normally');
  }],
  ['Delete final inline shop resets split and edit state', async ({ vm, tick }) => {
    seed(vm); const original = await expense(vm, tick); vm.editExpense(original); vm.splitMode = 'custom'; vm.customAmounts = { A: 100 }; vm.customAmountInputs = { A: '100' };
    vm.deleteCurrentShopInline(); await tick();
    equal(vm.form.id, null, 'Deleted shop resets edited record'); equal(vm.activeShopMembers, [], 'Deleted last shop clears active members');
    equal(vm.customAmounts, {}, 'Deleted last shop clears allocations'); equal(vm.customAmountInputs, {}, 'Deleted last shop clears input text');
    seedNewShop(vm); await expense(vm, tick); equal(vm.expenses.length, 1, 'New shop can save after deleted draft');
  }],
  ['Delete edited shop through manager resets draft', async ({ vm, tick }) => {
    seed(vm); const original = await expense(vm, tick); vm.editExpense(original); vm.shopManagerMode = 'editor'; vm.deleteShop(0); await tick();
    equal(vm.form.id, null, 'Manager deletion resets edit'); equal(vm.activeShopMembers, [], 'Manager deletion clears last shop members');
  }],
  ['Delete edited inline shop with another shop available', async ({ vm, tick }) => {
    seed(vm); const original = await expense(vm, tick); seedNewShop(vm); vm.editExpense(original); vm.deleteCurrentShopInline(); await tick();
    equal(vm.currentShop, 'Fresh', 'Remaining shop becomes active'); equal(vm.form.id, null, 'Deleted edit reset with remaining shop');
    equal(vm.activeShopMembers, ['A', 'B'], 'Remaining shop members retained');
    await expense(vm, tick); equal(vm.expenses.length, 1, 'Next save persists in remaining shop');
  }],
  ['Shop switch prunes all stale split maps', async ({ vm, tick }) => {
    seed(vm); vm.shopMemberMap.Cafe = ['A']; vm.selectShopInline('Cafe'); vm.form.price = 100; vm.splitMode = 'custom';
    vm.customAmounts = { A: 100 }; vm.customPercents = { A: 100 }; vm.customAmountInputs = { A: '100' }; vm.customPercentInputs = { A: '100' };
    seedNewShop(vm); vm.shopMemberMap.Fresh = ['B']; vm.selectShopInline('Fresh'); await tick();
    equal(vm.sumCustomAmount, 0, 'Hidden amounts removed'); equal(vm.sumCustomPercent, 0, 'Hidden percentages removed');
    ok(!Object.hasOwn(vm.customAmountInputs, 'A'), 'Hidden amount text removed'); ok(!Object.hasOwn(vm.customPercentInputs, 'A'), 'Hidden percentage text removed');
    vm.customAmounts = { B: 100 }; vm.customAmountInputs = { B: '100' }; vm.toggleActiveMembers(false); vm.toggleActiveMembers(true); await tick();
    equal(vm.getCustomAmountDisplay('B'), '', 'Readded member has no stale text');
  }],
  ['Member rename propagates through durable and draft references', async ({ vm, tick }) => {
    seed(vm); vm.shopDefaults.Cafe = 'A'; const original = await expense(vm, tick); vm.editExpense(original);
    vm.customAmounts = { A: 60, B: 40 }; vm.customPercents = { A: 60, B: 40 }; vm.customAmountInputs = { A: '60' }; vm.customPercentInputs = { A: '60' };
    vm.newShopMembers = ['A']; vm.newShopDefaultPayer = 'A'; vm.openCustomCalculator('A');
    vm.expenses[0].customAmounts = { A: 60, B: 40 }; vm.startEditMember(0); vm.tempMemberName = 'Alice'; vm.saveEditMember(0); await tick();
    equal(vm.activeShopMembers, ['Alice', 'B'], 'Active members renamed'); equal(vm.shopMemberMap.Cafe, ['Alice', 'B'], 'Shop members renamed');
    equal(vm.expenses[0].payer, 'Alice', 'Saved payer renamed'); equal(vm.expenses[0].consumers, ['Alice', 'B'], 'Saved consumers renamed');
    equal(vm.expenses[0].customAmounts, { Alice: 60, B: 40 }, 'Saved splits renamed'); equal(vm.form.payer, 'Alice', 'Draft payer renamed');
    equal(vm.customAmountInputs, { Alice: '60' }, 'Draft input renamed'); equal(vm.shopDefaults.Cafe, 'Alice', 'Default payer renamed');
    equal(vm.customAmounts, { Alice: 60, B: 40 }, 'Draft amounts renamed'); equal(vm.customPercents, { Alice: 60, B: 40 }, 'Draft percentages renamed');
    equal(vm.customPercentInputs, { Alice: '60' }, 'Draft percent text renamed'); equal(vm.form.consumers, ['Alice', 'B'], 'Draft consumers renamed');
    equal(vm.newShopMembers, ['Alice'], 'New shop member draft renamed'); equal(vm.newShopDefaultPayer, 'Alice', 'New shop payer draft renamed');
    equal(vm.calculatorTarget.member, 'Alice', 'Open calculator destination renamed'); vm.closeCustomCalculator();
    equal(vm.summary.reduce((sum, member) => sum + member.net, 0), 0, 'Rename preserves balance');
    vm.startEditMember(0); vm.tempMemberName = 'B'; vm.saveEditMember(0); equal(vm.people, ['Alice', 'B'], 'Duplicate rename rejected');
    vm.newPerson = ' Alice '; vm.addPerson(); equal(vm.people, ['Alice', 'B'], 'Duplicate addition rejected after trimming');
    vm.tempMemberName = '   '; vm.saveEditMember(0); equal(vm.people, ['Alice', 'B'], 'Whitespace-only rename rejected');
  }],
];
function seedNewShop(vm) { vm.setShopUiMode('add'); vm.newShopName = 'Fresh'; vm.createNewShop(); }
(async () => {
  let failures = 0;
  for (const [name, scenario] of scenarios) {
    const app = mount();
    try { await scenario(app); await app.tick(); equal(app.errors, [], 'No Vue/runtime warnings'); console.log('PASS ' + name); }
    catch (error) { failures++; console.error('FAIL ' + name + '\n' + error.stack); }
    finally { app.close(); }
  }
  console.log(`${assertions} assertions; ${scenarios.length} scenarios; ${failures} failures`);
  process.exitCode = failures ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
