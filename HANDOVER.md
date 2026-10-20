# BillSpliter v2.2.1 handover

Date: 2026-10-20 (Asia/Bangkok). Branch: `fix/android-clipboard-image`.
Release preparation: `v2.2.1`. Publishing, PR, merge, and deployment status must be checked on GitHub; this document records the tested source and release procedure.

## Delivered scope

- Copy the full summary PNG to the clipboard, then paste into LINE (Ctrl+V on Windows). The user confirmed desktop copying worked during preview testing. Native sharing was removed at the user's request; JPG/PNG downloads remain available.
- On mobile, open the image first and use native long-press Copy Image instead of the ineffective API copy buttons. A fixed preview frame opens immediately; repeated clicks share capture work, cached images are reused, closed/stale requests cannot restore an old image, and preview resizing does not refit the underlying receipt. Mobile canvas size is bounded; long receipts retain all content at reduced resolution. Desktop prepares images after Summary opens and retains direct clipboard copying.
- Mobile summary hierarchy puts the title/close first, image opening as the primary action and saving as secondary. Desktop receipt zoom controls are hidden in the narrow-screen summary.
- `Billsplitter.html`: compact shop context, prominent expense entry, calculator with apply-to-price/member amount/member percent and keyboard/focus handling.
- Earlier regression fixes retained: shop changes prune stale allocations and raw input maps; calculator rounding overflow/non-finite prices cannot be applied/saved through the form.
- This review pass fixed cancelled edits mutating saved consumer lists; deleting an edited item/shop leaving a stale edit ID; final-shop deletion leaving active members/split inputs; member rename leaving payer, consumer, shop/default, calculator, and split references under the old name. Names are trimmed and blank/duplicate add/rename attempts are rejected to prevent split-map collisions.
- Added `tests/smoke.cjs`, using isolated in-memory localStorage, and this handover. Historical backups are not rewritten when members are renamed.

## Verification

Repository smoke covers 80 assertions across 8 scenarios. `tests/copy-receipt.cjs` adds clipboard, rendering, invalidation, retry and download checks. `tests/release.cjs` checks version/entry/cache consistency. All must pass before publication. Clipboard and image rasterization are mocked in automated tests; see `tests/COPY_RECEIPT_QA.md` for manual QA.

The smoke suite mounts the actual Vue template and covers member creation/rename validation; shop creation, selection, rename, deletion and access guards; item add/edit/cancel/delete; calculator formulas, overflow, invalid/negative results, amount/percent caps, Enter/Escape and focus return; summary DOM rendering and an exact-balance fixture; persistence round-trip in a fresh app instance; stale split pruning.

From the repository root, with Node.js/npm installed, dependencies may stay outside the checkout:

```powershell
$smokeDeps = Join-Path $env:TEMP 'billsplitter-verify'
npm.cmd install --prefix $smokeDeps --no-audit --no-fund vue@3.5.44 jsdom@26.1.0
$env:NODE_PATH = Join-Path $smokeDeps 'node_modules'
node tests/smoke.cjs
node tests/copy-receipt.cjs
node tests/release.cjs
git -c core.whitespace=cr-at-eol diff --check
```

The existing temporary suites remain at `$smokeDeps/check.cjs` and `$smokeDeps/regressions.cjs`; run `node` against each from the repository root when those files are available. They are supplementary, not required for the repository smoke suite.

## Preview and remaining checks

Open **`Billsplitter.html`** through the local server for review. For release `v2.2.1`, `index.html`, the PWA manifest and the mobile-server entry target it. The service-worker release cache is `billspliter-v2-2-1`; activation removes only old BillSpliter caches. `tests/release.cjs` verifies exact-case cache assets and preserves unrelated caches. The persistence schema and legacy HTML file remain unchanged.

No browser surface was available. jsdom verifies behavior and DOM state, not actual layout: mobile 360–390px/desktop screenshots, real Bootstrap modal behavior, touch/focus experience, CDN/network loading, offline/service worker behavior, receipt image export and file import/export still need browser checks before release. Bootstrap is stubbed in smoke tests; the production CDN Vue version is floating while tests pin the installed version.

Existing financial limitation remains outside this UI change: summary rounds each person's totals/net to whole baht. For a 100-baht equal split among three people, one payer, rounded net balances can sum to 1 baht rather than zero. The smoke balance fixture uses two people and exact shares; it does not establish settlement accuracy for fractional/uneven shares.

Production is GitHub Pages at https://badtzmos-wq.github.io/Billsplter/, built automatically from `main` at `/`. After merge, verify the Pages deployment uses the merged commit, then verify the live index, app version, manifest and service worker against the source. See `DEPLOY_WEBAPP.md`.

Netlify is excluded from the release workflow. `netlify.toml` skips automatic Git-triggered builds. GitHub App access is managed outside the repository; the available API session cannot remove that installation, so repository access must also be removed in GitHub Settings to eliminate Netlify check reporting completely. This skip rule does not disable direct Netlify build hooks/manual deployments.
