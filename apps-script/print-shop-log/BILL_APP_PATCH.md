# Bill App Backend Patch

The original Bill App `Code.gs` is not in this workspace, so this file contains the exact backend replacements to paste into your spreadsheet-bound Apps Script project.

## 1. Replace `openDues_(ss)`

```js
function openDues_(ss) {
  var out = [];
  try {
    var sheet = ss.getSheetByName(CFG.sheets.dues);
    var hd = CFG.h.dues;
    var last = sheet.getLastRow();
    if (last < CFG.firstDataRow) return out;
    var tz = Session.getScriptTimeZone();
    for (var r = CFG.firstDataRow; r <= last; r++) {
      var name = String(valueAt_(sheet, r, hd.name) || '').trim();
      if (!name) continue;
      var due = Number(valueAt_(sheet, r, hd.amount)) || 0;
      var paid = Number(valueAt_(sheet, r, hd.paidso)) || 0;
      var remaining = Math.round((due - paid) * 100) / 100;
      var status = String(valueAt_(sheet, r, hd.status) || '').toUpperCase();
      if (status !== 'PAID' && remaining > 0.004) {
        var dd = valueAt_(sheet, r, hd.due);
        out.push({
          row: r,
          name: name,
          kind: String(valueAt_(sheet, r, hd.kind) || 'Bill'),
          invoice: String(valueAt_(sheet, r, hd.inv) || ''),
          dueDate: (dd && dd.getTime) ? Utilities.formatDate(dd, tz, 'yyyy-MM-dd') : String(dd || ''),
          amountDue: due,
          paidSoFar: paid,
          remaining: remaining,
          note: String(valueAt_(sheet, r, hd.note) || ''),
          status: status || 'DUE'
        });
      }
    }
  } catch (e) { }
  return out;
}
```

## 2. Add `saveDueDraft(entry)`

Paste this near the other phone-app backend functions, for example right after `saveEntry(entry)`.

```js
function saveDueDraft(entry) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var amount = Number(entry && entry.amount);
    if (!(amount > 0)) throw new Error('Please enter an amount due greater than 0.');
    if (!String(entry && entry.name || '').trim()) throw new Error('Please enter who is owed.');

    var summary = entry && entry.row
      ? updateDue_(ss, entry, amount)
      : addDue_(ss, entry, new Date(), amount);

    return { ok: true, summary: summary, dues: openDues_(ss) };
  } finally {
    lock.releaseLock();
  }
}
```

## 3. Add `updateDue_(ss, entry, amount)`

Paste this near `addDue_`, `payDue_`, and `deleteDue`.

```js
function updateDue_(ss, entry, amount) {
  var sheet = need_(ss, CFG.sheets.dues);
  var hd = CFG.h.dues;
  var r = Number(entry.row);
  if (!r || r < CFG.firstDataRow || r > sheet.getLastRow()) {
    throw new Error('That due bill could not be found. Refresh the app and try again.');
  }

  var currentName = String(valueAt_(sheet, r, hd.name) || '').trim();
  var currentKind = String(valueAt_(sheet, r, hd.kind) || 'Bill').trim();
  var currentRemaining = Math.round(((Number(valueAt_(sheet, r, hd.amount)) || 0) - (Number(valueAt_(sheet, r, hd.paidso)) || 0)) * 100) / 100;
  if (!currentName ||
      currentName !== String(entry.expectedName || '').trim() ||
      currentKind !== String(entry.expectedKind || '').trim() ||
      currentRemaining !== Math.round((Number(entry.expectedRemaining) || 0) * 100) / 100) {
    throw new Error('The Bills Due list changed. Refresh the app before editing.');
  }

  setCell_(sheet, r, hd.name, String(entry.name || '').trim());
  setCell_(sheet, r, hd.kind, String(entry.kind || 'Bill').trim() || 'Bill');

  if (String(entry.dueDate || '').trim()) {
    setCell_(sheet, r, hd.due, parseDate_(entry.dueDate));
  } else {
    sheet.getRange(r, col_(sheet, hd.due)).clearContent();
  }

  if (String(entry.invoice || '').trim()) {
    setCell_(sheet, r, hd.inv, invoiceValue_(entry.invoice));
  } else {
    sheet.getRange(r, col_(sheet, hd.inv)).clearContent();
  }

  setCell_(sheet, r, hd.amount, amount);

  if (String(entry.note || '').trim()) {
    setCell_(sheet, r, hd.note, String(entry.note || '').trim());
  } else {
    sheet.getRange(r, col_(sheet, hd.note)).clearContent();
  }

  refreshDueRow_(sheet, r);

  var status = String(valueAt_(sheet, r, hd.status) || '').toUpperCase();
  if (status === 'PAID' && isBlank_(sheet, r, hd.paidoff)) {
    setCell_(sheet, r, hd.paidoff, new Date());
  }
  if (status !== 'PAID' && !isBlank_(sheet, r, hd.paidoff)) {
    sheet.getRange(r, col_(sheet, hd.paidoff)).clearContent();
  }

  return 'Due updated - ' + String(entry.name || '').trim() + ' - $' + amount.toFixed(2) +
    (entry.dueDate ? ' - due ' + entry.dueDate : '') +
    (entry.invoice ? ' - Job #' + entry.invoice : '');
}
```

## 4. Optional log label cleanup

If you want the log wording to match the UI rename, change this line inside `log_`:

```js
bill: 'Current Bill Paid'
```

to:

```js
bill: 'Bills Paid'
```