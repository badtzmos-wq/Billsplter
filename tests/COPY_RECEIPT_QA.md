# Copy summary image QA

The summary provides **คัดลอกรูป** and JPG/PNG downloads. Native sharing and LINE integration are not part of this release.

Branch `fix/android-clipboard-image` adds **เปิดรูปเพื่อคัดลอก** for Android and iOS: open the actual PNG, then long-press it and use the browser's Copy Image command. Mobile no longer presents the ineffective API copy buttons. It works without the Clipboard API or native dialog support, never downloads automatically, and releases its object URL on close or bill changes. iPad desktop mode receives iOS instructions. Desktop keeps the API copy buttons. A successful Clipboard API write does not prove the image reached the native clipboard or that LINE accepts it.

Mobile prepares the PNG on demand rather than when Summary opens. The preview opens immediately into a fixed-height frame with a loading state; image scrolling is separate from its header, and status text has reserved space. Repeated clicks cannot restart it, closing cancels the display request, close/reopen shares a pending PNG job, and reopening a completed preview reuses the current bill image. Data changes invalidate the image. Resize events while the preview is open do not refit the underlying receipt; focus returns without scrolling. These checks cover known sources of layout movement, not measured device frame rates.

Mobile exports reduce the scale of large receipts to fit a conservative 2.9-million-pixel canvas budget and 8192-pixel edge limit, retaining the full receipt at reduced resolution. This protects against oversized canvas failures; it is not proof of compatibility with every device or legibility of arbitrarily long receipts. Desktop exports retain scale 2.

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
2. On desktop, wait for **คัดลอกรูป**, click it, and allow clipboard access if asked.
3. Open a LINE desktop chat and press Ctrl+V on Windows. Inspect the full image before sending.
4. Change bill/payment data and reopen Summary. Confirm the copied image is current.
5. Check long receipts and zoom; verify no cropping and no change to the live zoom during preparation.
6. Save JPG and PNG, including on a browser without image clipboard support. No file should download until a save action is chosen.
7. On Android/Samsung Internet, select **เปิดรูป**, long-press the image and choose **คัดลอกรูป** if offered. Open LINE and inspect the keyboard clipboard, then try inserting the image. This device check is still pending; if the native image is absent or cannot be inserted, save PNG and attach it from LINE instead.
8. Close/reopen the image, change bill data, and close Summary while preparing. Confirm no stale image remains, no automatic download occurs, and the zoom stays unchanged during preview preparation. Automated preview tests cover stale renders, retry, URL cleanup, and focus return; native context menus and LINE paste remain manual checks.
9. On iPhone/iPad Safari, open the image, long-press the PNG and choose Copy, then press and hold in LINE's message field and choose Paste. If rejected, save it to Photos and attach from LINE. Check portrait and landscape, a long receipt, rapid repeated opens, close/reopen during preparation, scrolling and rotation. Real iOS checks are pending.

The automated suite uses simulated iPhone, iPad desktop-mode and Samsung Internet navigator properties. It checks mobile open-first controls, immediate loading state, shared in-flight work, cached reopen, stale-request cancellation, canvas scale, unsupported-dialog fallback, desktop synchronous clipboard writes and failure/retry. It does not emulate Safari/WebKit, Android keyboards, touch callouts, actual responsive layout, or LINE.

No native share button should appear. Before release, increase the application version and service-worker cache together; `tests/release.cjs` checks their consistency.
