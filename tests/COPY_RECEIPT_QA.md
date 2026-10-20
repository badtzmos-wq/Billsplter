# Copy summary image QA

The summary provides **คัดลอกรูป** and JPG/PNG downloads. Native sharing and LINE integration are not part of this release.

Run from the repository root:

```powershell
$copyDeps = Join-Path $env:TEMP 'billsplitter-verify'
npm.cmd install --prefix $copyDeps --no-audit --no-fund vue@3.5.44 jsdom@26.1.0
$env:NODE_PATH = Join-Path $copyDeps 'node_modules'
node tests/copy-receipt.cjs
node tests/smoke.cjs
node tests/release.cjs
```

Automated checks mount the actual Vue template with isolated storage. Clipboard and rasterization are mocked. Coverage includes a full PNG receipt, direct clipboard write during the click, permission rejection/retry, duplicate writes, stale data/completions, closing/reopening, fonts/QR readiness, unchanged live zoom, and manual JPG/PNG downloads with URL cleanup. Tests also reject native sharing APIs in the application source.

The user confirmed clipboard copying worked in their desktop testing. No browser/device is connected to automation, so real image rendering and paste compatibility still require manual checking:

1. Open the HTTPS site, create a multi-shop bill with several members and payment/QR details, and open Summary.
2. Wait for **คัดลอกรูป**, click it, and allow clipboard access if asked.
3. Open a LINE desktop chat and press Ctrl+V on Windows. Inspect the full image before sending.
4. Change bill/payment data and reopen Summary. Confirm the copied image is current.
5. Check long receipts and zoom; verify no cropping and no change to the live zoom during preparation.
6. Save JPG and PNG, including on a browser without image clipboard support. No file should download until a save action is chosen.

No native share button should appear. Before release, increase the application version and service-worker cache together; `tests/release.cjs` checks their consistency.
