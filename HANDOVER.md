# Manager hierarchy and calculator handover

Date: 2026-10-20 (Asia/Bangkok). Branch: `feat/manager-hierarchy-calculator`.
Release preparation: `v2.1.0`. Publishing, PR, merge, and deployment status must be checked on GitHub; this document records the tested source and release procedure.

## Delivered scope

- `Billsplitter.html`: compact shop context, prominent expense entry, calculator with apply-to-price/member amount/member percent and keyboard/focus handling.
- Earlier regression fixes retained: shop changes prune stale allocations and raw input maps; calculator rounding overflow/non-finite prices cannot be applied/saved through the form.
- This review pass fixed cancelled edits mutating saved consumer lists; deleting an edited item/shop leaving a stale edit ID; final-shop deletion leaving active members/split inputs; member rename leaving payer, consumer, shop/default, calculator, and split references under the old name. Names are trimmed and blank/duplicate add/rename attempts are rejected to prevent split-map collisions.
- Added `tests/smoke.cjs`, using isolated in-memory localStorage, and this handover. Historical backups are not rewritten when members are renamed.

## Verification

Fresh results: repository smoke **80 assertions / 8 scenarios / 0 failures**; existing temporary integration checks **60 assertions** and prior regressions **17 assertions**, all passing. Five regression scenarios failed before their fixes (cancel edit, edited-item deletion, both shop-deletion routes, and member rename). No Vue/runtime warnings in tested scenarios.

The smoke suite mounts the actual Vue template and covers member creation/rename validation; shop creation, selection, rename, deletion and access guards; item add/edit/cancel/delete; calculator formulas, overflow, invalid/negative results, amount/percent caps, Enter/Escape and focus return; summary DOM rendering and an exact-balance fixture; persistence round-trip in a fresh app instance; stale split pruning.

From the repository root, with Node.js/npm installed, dependencies may stay outside the checkout:

```powershell
$smokeDeps = Join-Path $env:TEMP 'billsplitter-verify'
npm.cmd install --prefix $smokeDeps --no-audit --no-fund vue@3.5.44 jsdom@26.1.0
$env:NODE_PATH = Join-Path $smokeDeps 'node_modules'
node tests/smoke.cjs
node tests/release.cjs
git -c core.whitespace=cr-at-eol diff --check
```

The existing temporary suites remain at `$smokeDeps/check.cjs` and `$smokeDeps/regressions.cjs`; run `node` against each from the repository root when those files are available. They are supplementary, not required for the repository smoke suite.

## Preview and remaining checks

Open **`Billsplitter.html`** through the local server for review. For release `v2.1.0`, `index.html`, the PWA manifest and the mobile-server entry now target it. The service-worker release cache is `billspliter-v2-1-0`; activation removes only old BillSpliter caches. `tests/release.cjs` verifies exact-case cache assets and preserves unrelated caches. The persistence schema and legacy HTML file remain unchanged.

No browser surface was available. jsdom verifies behavior and DOM state, not actual layout: mobile 360–390px/desktop screenshots, real Bootstrap modal behavior, touch/focus experience, CDN/network loading, offline/service worker behavior, receipt image export and file import/export still need browser checks before release. Bootstrap is stubbed in smoke tests; the production CDN Vue version is floating while tests pin the installed version.

Existing financial limitation remains outside this UI change: summary rounds each person's totals/net to whole baht. For a 100-baht equal split among three people, one payer, rounded net balances can sum to 1 baht rather than zero. The smoke balance fixture uses two people and exact shares; it does not establish settlement accuracy for fractional/uneven shares.

Production is GitHub Pages at https://badtzmos-wq.github.io/Billsplter/, built automatically from `main` at `/`. After merge, verify the Pages deployment uses the merged commit, then verify the live index, app version, manifest and service worker against the source. See `DEPLOY_WEBAPP.md`.

Netlify is excluded from the release workflow. `netlify.toml` skips automatic Git-triggered builds. GitHub App access is managed outside the repository; the available API session cannot remove that installation, so repository access must also be removed in GitHub Settings to eliminate Netlify check reporting completely. This skip rule does not disable direct Netlify build hooks/manual deployments.
