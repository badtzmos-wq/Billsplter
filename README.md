# BillSpliter

A lightweight, single-file bill splitting web app for group meals, trips, and shared expenses. BillSpliter helps users record members, shops, expenses, payment methods, and calculate who should pay or receive money after splitting the bill.

> Current version: `v2.0.4`  
> Author label: `Badtz.mos`

---

## Overview

BillSpliter is designed for quick shared-expense tracking without a backend. The app runs directly in the browser and stores data locally using `localStorage`. It supports member management, shop-based expense grouping, equal/custom split modes, payment information, backup/restore, and image export for the final receipt summary.

Version `v2.0.4` focuses on layout improvement only. The app shell was refactored so the left control panel and right saved-list panel can scroll independently while keeping the header visible. Business logic is not changed in this version.

---

## Features

### Member Management

- Add, edit, and remove members.
- Display member count.
- Use members as payers or participants in split calculations.

### Shop / Place Management

- Create multiple shops or locations.
- Select a current shop before adding expenses.
- Assign default payer per shop.
- Manage participating members per shop.
- Reorder shops with drag-and-drop.

### Expense Management

- Add item name, price, and payer.
- Group expenses by shop.
- Edit or delete saved expense items.
- Reorder expenses using drag-and-drop.
- Mobile-friendly expense cards with move up/down actions.

### Split Modes

- Equal split mode: split an item equally among selected participants.
- Custom split mode: manually assign each person’s share.
- Custom split can be entered as:
  - Amount in THB
  - Percentage
- Includes a custom calculator popup for quick per-person calculation.
- Validates that custom split totals match the item price before saving.

### Summary & Settlement

- Calculate grand total.
- Calculate each person’s consumed amount, paid amount, and net balance.
- Generate settlement instructions showing who should transfer money to whom.
- Display summary by person and by shop.
- Supports zoom and auto-fit for the summary receipt view.

### Payment Information

- QR Code upload.
- PromptPay detail.
- Bank account detail.
- Account holder name.

### Backup & Restore

- Save the current bill as a named bill history.
- Update the currently loaded bill.
- Restore previous bill history from the browser.
- Delete saved histories.
- Export all current data and histories as `.json`.
- Import `.json` backup files to restore data on another device/browser.

### Receipt Export

- Export the summary receipt as `.JPG`.
- Export the summary receipt as `.PNG`.
- Uses `html2canvas` for image capture.

### Responsive UI

- Desktop layout uses independent left/right scrolling panels.
- Mobile layout switches to a natural single-page scroll.
- Expense table becomes mobile cards on small screens.
- Receipt/export layout includes Safari-safe grid handling.

---

## Basic Usage

1. Add members in the **Member** tab.
2. Go to **Manager** and create a shop/place.
3. Select members who joined that shop.
4. Add expense items with price and payer.
5. Choose split mode:
   - Equal split
   - Custom amount / percentage split
6. Open **Summary** to review totals and settlement.
7. Add payment information in the **Payment** tab.
8. Export the receipt image or backup the data as `.json`.

---

## Data Storage

BillSpliter stores data in the browser using `localStorage`.
