/**
 * MY SHIRT PROFIT & OPERATIONS SYSTEM — v1 (fresh start July 1, 2026)
 * ONE script file. Spreadsheet-bound. Also serves the Print Shop Log phone app.
 *
 * INSTALL (one time):
 *   1. Open the new spreadsheet > Extensions > Apps Script.
 *   2. Delete anything in Code.gs, paste ALL of this file, save.
 *   3. Add an HTML file named exactly:  Index   and paste Index.html into it, save.
 *   4. Run the function  setup  once (choose it in the toolbar, press Run) and
 *      allow the permissions it asks for.
 *   5. For the phone app: Deploy > New deployment > Web app >
 *      Execute as: Me / Who has access: Only myself > Deploy. Open the URL on
 *      your phone and add it to your home screen.
 *
 * You never need to edit anything below.
 */

// ---------------------------------------------------------------- settings
var CFG = {
  sheets: {
    inputs: 'Inputs',
    jobs: 'Jobs',
    costs: 'Costs & Vendors',
    labor: 'Labor',
    dues: 'Bills Due',
    overhead: 'Overhead',
    debt: 'Debt Tracker',
    commission: 'Commission Tracker',
    card: 'Card Purchases',
    log: 'App Log',
    checks: 'Checks'
  },
  headerRow: 3,
  firstDataRow: 4,
  h: {
    jobs: { inv: 'Invoice / Job #', date: 'Job Date', month: 'Month', cust: 'Customer',
            desc: 'Job Description', amount: 'Invoice Amount', vend: 'Vendor Total',
            prod: 'Product / Material Total', lcount: 'Labor Entries', lcost: 'Job Labor Cost',
            tdc: 'Total Direct Cost', gp: 'Gross Profit', gm: 'Gross Margin %',
            pay: 'Payment Method', tax: 'Tax Collected',
            invtotal: 'Invoice Total', paidamt: 'Amount Paid', baldue: 'Balance Due' },
    costs: { date: 'Date', inv: 'Invoice / Job #', cust: 'Customer', type: 'Cost Type',
             vendor: 'Vendor / Supplier', desc: 'Description', amount: 'Amount',
             paid: 'Paid?', paydate: 'Payment Date' },
    labor: { date: 'Date', month: 'Month', inv: 'Invoice #', cost: 'Labor Cost',
             type: 'Labor Type', notes: 'Notes', paid: 'Paid', bal: 'Balance Due' },
    dues: { added: 'Added', due: 'Due Date', name: 'Name', kind: 'Bill / Debt',
            inv: 'Invoice #', amount: 'Amount Due', paidso: 'Paid So Far',
            rem: 'Remaining', status: 'Status', paidoff: 'Paid Off Date', note: 'Note' },
    over: { date: 'Date', month: 'Month', cat: 'Category', amount: 'Amount', notes: 'Notes' },
    comm: { date: 'Date', type: 'Entry Type', inv: 'Invoice Number', cust: 'Customer / Notes',
            invtot: 'Invoice Total', profit: 'Profit Total',
            earned: 'Commission Earned', paid: 'Payment Received',
            run: 'Running Commission Balance' },
    card: { date: 'Date', desc: 'Description', charge: 'Charge',
            pay: 'Payment / Reimbursement', chg: 'Balance Change', run: 'Running Balance' },
    log: { at: 'Logged At', date: 'Entry Date', src: 'Source', type: 'Type',
           who: 'Who / What', amount: 'Amount', note: 'Note', summary: 'Summary',
           status: 'Status' },
    debtT: { type: 'Debt Type', rem: 'Remaining Balance' }
  }
};
var NOTIFY_EMAIL = '';

var JOB_DESC_OPTIONS = ['Heat Transfers', 'Printing', 'Embroidery'];
var EMB_NOTE = 'Embroidery - no labor';

var AUTO_LABOR_NOTE = 'Standard labor cost (auto). Change it any time - your amount then becomes permanent.';
var MANUAL_LABOR_NOTE = 'Manual labor cost - automation will not replace this value.';
var MERGED_LABOR_NOTE = 'Merged into the first labor row for this invoice.';

var PAYMENT_METHODS = ['Zelle', 'Check', 'Credit Card'];

// ------------------------------------------------------------------- setup
function setup() {
  var removed = removeObsoleteEditTriggers();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Cleanup done (' + removed + ' old trigger(s) removed). Automation now runs by itself - no trigger needed.',
    'My Shirt Tools', 8);
}

function removeObsoleteEditTriggers() {
  var removed = 0;
  var kill = { onEdit: 1, onOpen: 1, onEditInstalled: 1, onOpenInstalled: 1, handleEdit_: 1 };
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (kill[t.getHandlerFunction()]) { ScriptApp.deleteTrigger(t); removed++; }
  });
  return removed;
}

function onEdit(e) { handleEdit_(e); }

function onOpen(e) {
  try {
    SpreadsheetApp.getUi().createMenu('My Shirt Tools')
      .addItem('Sync selected invoice', 'menuSyncSelected')
      .addItem('Sync ALL invoices', 'menuSyncAll')
      .addItem('Fill missing commissions', 'menuHealCommissions')
      .addItem('Arrange payment columns', 'menuArrangeColumns')
      .addItem('Run self-test (6 tests)', 'runSelfTest')
      .addSeparator()
      .addItem('Go to Checks', 'menuChecks')
      .addToUi();
  } catch (err) { }
  try { healCommissions_(); } catch (err) { }
  try { ensureDescValidation_(); } catch (err) { }
  try { ensureJobsColumns_(); } catch (err) { }
}

function ensureJobsColumns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = ss.getSheetByName(CFG.sheets.jobs);
  if (!jobs) return;

  removeColumnIfExists_(jobs, CFG.h.jobs.invtotal);

  var addColumn = function (label) {
    var headers = jobs.getRange(CFG.headerRow, 1, 1, Math.max(jobs.getLastColumn(), 1)).getDisplayValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === label) return i + 1;
    }
    var c = jobs.getLastColumn() + 1;
    jobs.getRange(CFG.headerRow, c).setValue(label).setFontWeight('bold');
    _colCache = {};
    return c;
  };

  addColumn(CFG.h.jobs.pay);
  addColumn(CFG.h.jobs.tax);
  addColumn(CFG.h.jobs.paidamt);
  addColumn(CFG.h.jobs.baldue);

  try { positionAfter_(jobs, CFG.h.jobs.amount, [CFG.h.jobs.tax, CFG.h.jobs.paidamt, CFG.h.jobs.baldue]); } catch (e) { }
  _colCache = {};

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAYMENT_METHODS, true)
    .setAllowInvalid(true)
    .setHelpText('How the invoice was paid: Zelle, Check, or Credit Card.')
    .build();
  jobs.getRange(CFG.firstDataRow, col_(jobs, CFG.h.jobs.pay), 996, 1).setDataValidation(rule);
  [CFG.h.jobs.tax, CFG.h.jobs.paidamt, CFG.h.jobs.baldue].forEach(function (lbl) {
    jobs.getRange(CFG.firstDataRow, col_(jobs, lbl), 996, 1).setNumberFormat('$#,##0.00');
  });
}

function removeColumnIfExists_(sheet, label) {
  var headers = sheet.getRange(CFG.headerRow, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === label) {
      sheet.deleteColumn(i + 1);
      _colCache = {};
      return true;
    }
  }
  return false;
}

function positionAfter_(sheet, anchorLabel, labels) {
  labels.forEach(function (lbl, i) {
    var headers = sheet.getRange(CFG.headerRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    var anchor = headers.indexOf(anchorLabel) + 1;
    var cur = headers.indexOf(lbl) + 1;
    if (anchor <= 0 || cur <= 0) return;
    var target = anchor + 1 + i;
    if (cur === target) return;
    sheet.moveColumns(sheet.getRange(1, cur, sheet.getMaxRows(), 1), target);
    _colCache = {};
  });
}

function recordInvoicePayment_(ss, p) {
  ensureJobsColumns_();
  var jobs = need_(ss, CFG.sheets.jobs);
  var jc = CFG.h.jobs;
  var inv = String(p.invoice || '').trim();
  if (!inv || isTotals_(inv)) throw new Error('a valid invoice number is required.');
  var method = String(p.method || '').trim();
  var customer = String(p.customer || '').trim();
  var taxNum = Number(p.tax);
  var hasTax = p.tax !== '' && p.tax !== null && p.tax !== undefined && !isNaN(taxNum);
  var saleNum = Number(p.sale);
  var hasSale = p.sale !== '' && p.sale !== null && p.sale !== undefined && !isNaN(saleNum) && saleNum > 0;
  var paidSnap = Number(p.paidSnapshot);
  var hasSnap = p.paidSnapshot !== '' && p.paidSnapshot !== null && p.paidSnapshot !== undefined && !isNaN(paidSnap);
  var addNum = Number(p.payAdd);
  var hasAdd = p.payAdd !== '' && p.payAdd !== null && p.payAdd !== undefined && !isNaN(addNum) && addNum > 0;
  var amount = Number(p.amount) || 0;
  var d = p.date ? parseDate_(p.date) : new Date();
  var source = p.source || 'App';

  var rows = findRows_(jobs, col_(jobs, jc.inv), inv);
  var created = false;
  var jr;
  if (!rows.length) {
    jr = nextBlankRow_(jobs, col_(jobs, jc.inv));
    setCell_(jobs, jr, jc.inv, invoiceValue_(inv));
    created = true;
  } else {
    jr = rows[0];
  }

  if (customer) setCell_(jobs, jr, jc.cust, customer);
  fillIfBlank_(jobs, jr, jc.date, d);
  if (hasSale) setCell_(jobs, jr, jc.amount, saleNum);
  if (hasTax) setCell_(jobs, jr, jc.tax, taxNum);

  if (hasSnap) {
    setCell_(jobs, jr, jc.paidamt, paidSnap);
  } else if (hasAdd) {
    var cur = Number(valueAt_(jobs, jr, jc.paidamt)) || 0;
    setCell_(jobs, jr, jc.paidamt, Math.round((cur + addNum) * 100) / 100);
  }
  SpreadsheetApp.flush();

  syncInvoice_(inv, '', 0);

  var existing = String(valueAt_(jobs, jr, jc.pay) || '').trim();
  var methodOut = method || existing;
  if (method && method.toLowerCase() !== existing.toLowerCase()) {
    setCell_(jobs, jr, jc.pay, method);
  }

  var paidNow = Number(valueAt_(jobs, jr, jc.paidamt)) || 0;
  var note = 'recv: cust="' + customer + '" amount=' + (hasSale ? saleNum : '(none)') +
    ' tax=' + (hasTax ? taxNum : '(none)') + ' paid=' + (hasSnap ? paidSnap : (hasAdd ? '+' + addNum : '(none)'));
  var msg = (created ? 'Added invoice #' + inv + ' to the books' : 'Invoice #' + inv + ' updated') +
    (method ? ' - paid by ' + method : '') + (paidNow ? ' - paid so far $' + paidNow.toFixed(2) : '');
  appLog_(ss, source, 'Invoice Payment', 'Job #' + inv + (methodOut ? ' (' + methodOut + ')' : ''), amount, note, msg, 'OK');
  return { ok: true, created: created, method: methodOut, paid: paidNow, summary: msg };
}

function appLog_(ss, source, type, who, amount, note, summary, status) {
  try {
    var sheet = need_(ss, CFG.sheets.log);
    sheet.appendRow([new Date(), new Date(), source, type, who, Number(amount) || 0, note || '', summary || '', status || 'OK']);
  } catch (e) { }
}

function doPost(e) {
  var out = { ok: false, error: 'Unknown request' };
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var action = String(p.action || '').trim();
    if (action === 'record_payment') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var lock = LockService.getDocumentLock();
      lock.waitLock(20000);
      try {
        out = recordInvoicePayment_(ss, {
          invoice: p.invoice,
          method: p.method,
          tax: p.tax,
          amount: p.amount,
          date: p.date,
          source: 'Website',
          customer: p.customer,
          sale: p.sale,
          paidSnapshot: p.paidSnapshot
        });
      } finally {
        lock.releaseLock();
      }
    }
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function ensureDescValidation_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = ss.getSheetByName(CFG.sheets.jobs);
  if (!jobs) return;
  var c = col_(jobs, CFG.h.jobs.desc);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(JOB_DESC_OPTIONS, true)
    .setAllowInvalid(true)
    .setHelpText('Choose Heat Transfers, Printing, or Embroidery. Embroidery jobs get no labor cost.')
    .build();
  jobs.getRange(CFG.firstDataRow, c, 996, 1).setDataValidation(rule);
}

function onEditInstalled(e) { }
function onOpenInstalled(e) { }

function menuHealCommissions() {
  var n = healCommissions_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    n === 0 ? 'All jobs already have their commission row.' : n + ' commission row(s) added.',
    'My Shirt Tools', 6);
}

function healCommissions_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = ss.getSheetByName(CFG.sheets.jobs);
  var comm = ss.getSheetByName(CFG.sheets.commission);
  if (!jobs || !comm) return 0;
  var jc = CFG.h.jobs;
  var hc = CFG.h.comm;
  var last = jobs.getLastRow();
  if (last < CFG.firstDataRow) return 0;
  var cInv = col_(jobs, jc.inv);
  var cAmt = col_(jobs, jc.amount);
  var vals = jobs.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, jobs.getLastColumn()).getValues();
  var have = {};
  var clast = comm.getLastRow();
  if (clast >= CFG.firstDataRow) {
    comm.getRange(CFG.firstDataRow, 1, clast - CFG.firstDataRow + 1, col_(comm, hc.inv)).getValues()
      .forEach(function (r) {
        var t = String(r[col_(comm, hc.type) - 1] || '').trim();
        if (t === 'Commission') have[normKey_(r[col_(comm, hc.inv) - 1])] = 1;
      });
  }
  var missing = [];
  var seen = {};
  vals.forEach(function (r) {
    var inv = String(r[cInv - 1] == null ? '' : r[cInv - 1]).trim();
    if (!inv || isTotals_(inv)) return;
    var key = normKey_(inv);
    if (seen[key] || have[key]) return;
    seen[key] = 1;
    if (r[cAmt - 1] !== '' && r[cAmt - 1] !== null) missing.push(inv);
  });
  if (missing.length) {
    withLock_(function () {
      missing.forEach(function (inv) { syncInvoice_(inv, '', 0); });
    });
  }
  return missing.length;
}

function menuChecks() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(ss.getSheetByName(CFG.sheets.checks));
}

function menuArrangeColumns() {
  ensureJobsColumns_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Tax Collected, Amount Paid and Balance Due are now right after Invoice Amount.', 'My Shirt Tools', 6);
}

function menuSyncSelected() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var name = sheet.getName();
  var invColMap = invoiceColumnFor_(name);
  if (!invColMap) {
    SpreadsheetApp.getUi().alert('Select a row on Jobs, Costs & Vendors, or Labor first.');
    return;
  }
  var row = sheet.getActiveRange().getRow();
  var inv = displayAt_(sheet, row, invColMap);
  if (!inv || isTotals_(inv)) {
    SpreadsheetApp.getUi().alert('That row has no usable invoice number.');
    return;
  }
  withLock_(function () { syncInvoice_(inv, name, row); });
  ss.toast('Invoice ' + inv + ' synchronized.', 'My Shirt Tools', 5);
}

function menuSyncAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var seen = {};
  var list = [];
  [[CFG.sheets.jobs, CFG.h.jobs.inv], [CFG.sheets.costs, CFG.h.costs.inv],
   [CFG.sheets.labor, CFG.h.labor.inv]].forEach(function (pair) {
    var sheet = ss.getSheetByName(pair[0]);
    if (!sheet) return;
    var col = col_(sheet, pair[1]);
    var last = sheet.getLastRow();
    if (last < CFG.firstDataRow) return;
    sheet.getRange(CFG.firstDataRow, col, last - CFG.firstDataRow + 1, 1)
      .getDisplayValues().forEach(function (r) {
        var inv = String(r[0] || '').trim();
        if (inv && !isTotals_(inv) && !seen[normKey_(inv)]) {
          seen[normKey_(inv)] = 1;
          list.push(inv);
        }
      });
  });
  withLock_(function () {
    list.forEach(function (inv) { syncInvoice_(inv, '', 0); });
  });
  ss.toast(list.length + ' invoice(s) synchronized.', 'My Shirt Tools', 6);
}

// ---------------------------------------------------------------- on edit
function handleEdit_(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var name = sheet.getName();
  try {
    if (name === CFG.sheets.commission) { handleCommissionEdit_(sheet, e.range); return; }
    if (name === CFG.sheets.card) { handleCardEdit_(sheet, e.range); return; }
    if (name === CFG.sheets.dues) { handleDuesEdit_(sheet, e.range); return; }
    var invCol = invoiceColumnFor_(name);
    if (!invCol) return;

    if (name === CFG.sheets.jobs) {
      var jobLaborCol = col_(sheet, CFG.h.jobs.lcost);
      if (e.range.getColumn() <= jobLaborCol && e.range.getLastColumn() >= jobLaborCol) {
        withLock_(function () {
          saveJobLaborOverride_(sheet, e.range, invCol, jobLaborCol);
        });
        return;
      }
    }

    if (name === CFG.sheets.labor) {
      var laborCostCol = col_(sheet, CFG.h.labor.cost);
      if (e.range.getColumn() <= laborCostCol && e.range.getLastColumn() >= laborCostCol) {
        markManualLaborCells_(sheet, e.range, laborCostCol);
        return;
      }
    }

    var r1 = Math.max(e.range.getRow(), CFG.firstDataRow);
    var r2 = e.range.getLastRow();
    if (r2 < CFG.firstDataRow) return;
    var n = r2 - r1 + 1;
    if (n < 1) return;
    var invs = sheet.getRange(r1, invCol, n, 1).getDisplayValues();
    var seen = {};
    var work = [];
    for (var i = 0; i < n; i++) {
      var inv = String(invs[i][0] || '').trim();
      if (inv && !isTotals_(inv) && !seen[normKey_(inv)]) {
        seen[normKey_(inv)] = 1;
        work.push({ inv: inv, row: r1 + i });
      }
    }
    if (!work.length) return;
    withLock_(function () {
      work.forEach(function (w) { syncInvoice_(w.inv, name, w.row); });
    });
  } catch (err) {
    friendlyError_('Sheet sync', err);
  }
}

function markManualLaborCells_(labor, range, laborCostCol) {
  try {
    var r1 = Math.max(range.getRow(), CFG.firstDataRow);
    var r2 = range.getLastRow();
    for (var r = r1; r <= r2; r++) {
      var v = labor.getRange(r, laborCostCol).getValue();
      if (v === '' || v === null) continue;
      labor.getRange(r, laborCostCol).setNote(MANUAL_LABOR_NOTE);
    }
  } catch (e) { }
}

function saveJobLaborOverride_(jobs, editedRange, invCol, jobLaborCol) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var labor = need_(ss, CFG.sheets.labor);
  var lc = CFG.h.labor;
  var r1 = Math.max(editedRange.getRow(), CFG.firstDataRow);
  var r2 = editedRange.getLastRow();
  if (r2 < CFG.firstDataRow) return;

  for (var r = r1; r <= r2; r++) {
    var invoice = displayAt_(jobs, r, invCol);
    if (!invoice || isTotals_(invoice)) continue;

    var entered = jobs.getRange(r, jobLaborCol).getValue();
    if (entered === '' || entered === null || isNaN(Number(entered))) {
      applyJobFormulas_(jobs, r);
      continue;
    }
    var wantedTotal = Math.round(Number(entered) * 100) / 100;

    var lrows = findRows_(labor, col_(labor, lc.inv), invoice);
    if (!lrows.length) {
      syncInvoice_(invoice, CFG.sheets.jobs, r);
      lrows = findRows_(labor, col_(labor, lc.inv), invoice);
    }
    if (!lrows.length) continue;

    var costCol = col_(labor, lc.cost);
    var otherTotal = 0;
    for (var i = 1; i < lrows.length; i++) {
      var noteI = labor.getRange(lrows[i], costCol).getNote();
      if (noteI === AUTO_LABOR_NOTE) {
        setCell_(labor, lrows[i], lc.cost, 0);
        labor.getRange(lrows[i], costCol).setNote(MERGED_LABOR_NOTE);
      } else {
        otherTotal += Number(valueAt_(labor, lrows[i], lc.cost)) || 0;
      }
    }
    var firstCost = Math.round(Math.max(0, wantedTotal - otherTotal) * 100) / 100;
    setCell_(labor, lrows[0], lc.cost, firstCost);
    labor.getRange(lrows[0], costCol).setNote(MANUAL_LABOR_NOTE);

    for (var k = 0; k < lrows.length; k++) applyLaborFormulas_(labor, lrows[k]);
    applyJobFormulas_(jobs, r);
  }
  SpreadsheetApp.flush();
}

function invoiceColumnFor_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  if (sheetName === CFG.sheets.jobs) return col_(sheet, CFG.h.jobs.inv);
  if (sheetName === CFG.sheets.costs) return col_(sheet, CFG.h.costs.inv);
  if (sheetName === CFG.sheets.labor) return col_(sheet, CFG.h.labor.inv);
  return 0;
}

// ------------------------------------------------------ invoice sync core
function syncInvoice_(invoice, sourceSheetName, sourceRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = need_(ss, CFG.sheets.jobs);
  var costs = need_(ss, CFG.sheets.costs);
  var labor = need_(ss, CFG.sheets.labor);

  var info = readSource_(ss, sourceSheetName, sourceRow);

  var jc = CFG.h.jobs;
  var jobRows = findRows_(jobs, col_(jobs, jc.inv), invoice);
  var jobRow;
  if (!jobRows.length) {
    jobRow = nextBlankRow_(jobs, col_(jobs, jc.inv));
    setCell_(jobs, jobRow, jc.inv, invoiceValue_(invoice));
    jobRows = [jobRow];
  } else {
    jobRow = jobRows[0];
  }

  fillIfBlank_(jobs, jobRow, jc.date, info.date);
  fillIfBlank_(jobs, jobRow, jc.cust, info.customer);
  if (sourceSheetName === CFG.sheets.jobs) {
    fillIfBlank_(jobs, jobRow, jc.amount, info.invoiceAmount);
  }
  jobRows.forEach(function (r) { applyJobFormulas_(jobs, r); });
  SpreadsheetApp.flush();

  var agg = aggregateJob_(jobs, invoice);

  var cc = CFG.h.costs;
  if (!findRows_(costs, col_(costs, cc.inv), invoice).length) {
    var cr = nextBlankRow_(costs, col_(costs, cc.inv));
    setCell_(costs, cr, cc.date, agg.date || info.date || '');
    setCell_(costs, cr, cc.inv, invoiceValue_(invoice));
    setCell_(costs, cr, cc.cust, agg.customer || info.customer || '');
  } else {
    var firstCost = findRows_(costs, col_(costs, cc.inv), invoice)[0];
    fillIfBlank_(costs, firstCost, cc.date, agg.date || info.date);
    fillIfBlank_(costs, firstCost, cc.cust, agg.customer || info.customer);
  }

  var lc = CFG.h.labor;
  var isEmb = /^embroidery$/i.test(String(valueAt_(jobs, jobRow, jc.desc) || '').trim());
  var stdLabor = Number(setting_('Standard Job Labor', 100)) || 100;
  var lrows = findRows_(labor, col_(labor, lc.inv), invoice);
  if (!lrows.length) {
    var lr = nextBlankRow_(labor, col_(labor, lc.inv));
    setCell_(labor, lr, lc.date, agg.date || info.date || '');
    setCell_(labor, lr, lc.inv, invoiceValue_(invoice));
    setCell_(labor, lr, lc.cost, isEmb ? 0 : stdLabor);
    labor.getRange(lr, col_(labor, lc.cost)).setNote(AUTO_LABOR_NOTE);
    setCell_(labor, lr, lc.type, 'Job');
    setCell_(labor, lr, lc.notes, isEmb ? EMB_NOTE : (agg.customer || info.customer || ''));
    applyLaborFormulas_(labor, lr);
  } else {
    lrows.forEach(function (r) {
      fillIfBlank_(labor, r, lc.type, 'Job');
      fillIfBlank_(labor, r, lc.notes, agg.customer || info.customer);
      fillIfBlank_(labor, r, lc.date, agg.date || info.date);
      applyLaborFormulas_(labor, r);
    });
  }
  SpreadsheetApp.flush();

  upsertCommission_(ss, invoice, aggregateJob_(jobs, invoice));
}

function readSource_(ss, sheetName, row) {
  var info = { date: '', customer: '', invoiceAmount: '' };
  if (!sheetName || !row) return info;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || row < CFG.firstDataRow) return info;
  if (sheetName === CFG.sheets.jobs) {
    var jc = CFG.h.jobs;
    info.date = valueAt_(sheet, row, jc.date);
    info.customer = valueAt_(sheet, row, jc.cust);
    info.invoiceAmount = valueAt_(sheet, row, jc.amount);
  } else if (sheetName === CFG.sheets.costs) {
    var cc = CFG.h.costs;
    info.date = valueAt_(sheet, row, cc.date);
    info.customer = valueAt_(sheet, row, cc.cust);
  } else if (sheetName === CFG.sheets.labor) {
    info.date = valueAt_(sheet, row, CFG.h.labor.date);
  }
  return info;
}

function aggregateJob_(jobs, invoice) {
  var jc = CFG.h.jobs;
  var last = jobs.getLastRow();
  var out = { date: '', customer: '', invoiceTotal: 0, grossProfit: 0, tax: 0, hasAmount: false };
  if (last < CFG.firstDataRow) return out;
  var vals = jobs.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, jobs.getLastColumn()).getValues();
  var cInv = col_(jobs, jc.inv) - 1;
  var cDate = col_(jobs, jc.date) - 1;
  var cCust = col_(jobs, jc.cust) - 1;
  var cAmt = col_(jobs, jc.amount) - 1;
  var cGp = col_(jobs, jc.gp) - 1;
  var cTax = hasColumn_(jobs, jc.tax) ? col_(jobs, jc.tax) - 1 : -1;
  var key = normKey_(invoice);
  vals.forEach(function (r) {
    if (normKey_(r[cInv]) !== key) return;
    if (!out.date && r[cDate]) out.date = r[cDate];
    if (!out.customer && r[cCust]) out.customer = r[cCust];
    if (r[cAmt] !== '' && r[cAmt] !== null) {
      out.hasAmount = true;
      out.invoiceTotal += Number(r[cAmt]) || 0;
    }
    out.grossProfit += Number(r[cGp]) || 0;
    if (cTax >= 0) out.tax += Number(r[cTax]) || 0;
  });
  return out;
}

function applyJobFormulas_(jobs, r) {
  var jc = CFG.h.jobs;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var costs = need_(ss, CFG.sheets.costs);
  var labor = need_(ss, CFG.sheets.labor);
  var A = a1_(jobs, jc.inv);
  var B = a1_(jobs, jc.date);
  var F = a1_(jobs, jc.amount);
  var cv = "'" + CFG.sheets.costs + "'";
  var lb = "'" + CFG.sheets.labor + "'";
  var cInv = cv + '!$' + a1_(costs, CFG.h.costs.inv) + '$4:$' + a1_(costs, CFG.h.costs.inv) + '$999';
  var cTyp = cv + '!$' + a1_(costs, CFG.h.costs.type) + '$4:$' + a1_(costs, CFG.h.costs.type) + '$999';
  var cAmt = cv + '!$' + a1_(costs, CFG.h.costs.amount) + '$4:$' + a1_(costs, CFG.h.costs.amount) + '$999';
  var lInv = lb + '!$' + a1_(labor, CFG.h.labor.inv) + '$4:$' + a1_(labor, CFG.h.labor.inv) + '$999';
  var lCst = lb + '!$' + a1_(labor, CFG.h.labor.cost) + '$4:$' + a1_(labor, CFG.h.labor.cost) + '$999';
  var put = function (label, f) {
    var cell = jobs.getRange(r, col_(jobs, label));
    if (cell.getFormula() !== f) cell.setFormula(f);
  };
  put(jc.month, '=IF(' + B + r + '="","",DATE(YEAR(' + B + r + '),MONTH(' + B + r + '),1))');
  put(jc.vend, '=IF($' + A + r + '="","",SUMPRODUCT((' + cInv + '&""=$' + A + r + '&"")*(' + cTyp + '<>"Product / Material")*N(' + cAmt + ')))');
  put(jc.prod, '=IF($' + A + r + '="","",SUMPRODUCT((' + cInv + '&""=$' + A + r + '&"")*(' + cTyp + '="Product / Material")*N(' + cAmt + ')))');
  put(jc.lcount, '=IF($' + A + r + '="","",SUMPRODUCT((' + lInv + '&""=$' + A + r + '&"")*1))');
  put(jc.lcost, '=IF($' + A + r + '="","",SUMPRODUCT((' + lInv + '&""=$' + A + r + '&"")*N(' + lCst + ')))');
  var G = a1_(jobs, jc.vend);
  var H = a1_(jobs, jc.prod);
  var J = a1_(jobs, jc.lcost);
  var K = a1_(jobs, jc.tdc);
  var L = a1_(jobs, jc.gp);
  put(jc.tdc, '=IF($' + A + r + '="","",N(' + G + r + ')+N(' + H + r + ')+N(' + J + r + '))');
  put(jc.gp, '=IF(OR($' + A + r + '="",' + F + r + '=""),"",' + F + r + '-' + K + r + ')');
  put(jc.gm, '=IFERROR(IF(OR(' + F + r + '="",' + F + r + '=0),"",' + L + r + '/' + F + r + '),"")');
  if (hasColumn_(jobs, jc.baldue) && hasColumn_(jobs, jc.paidamt)) {
    var PAID = a1_(jobs, jc.paidamt);
    put(jc.baldue, '=IF($' + A + r + '="","",N(' + F + r + ')-N(' + PAID + r + '))');
  }
}

function hasColumn_(sheet, label) {
  try {
    var headers = sheet.getRange(CFG.headerRow, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
    for (var i = 0; i < headers.length; i++) if (String(headers[i]).trim() === label) return true;
  } catch (e) { }
  return false;
}

function applyLaborFormulas_(labor, r) {
  var lc = CFG.h.labor;
  var A = a1_(labor, lc.date);
  var D = a1_(labor, lc.cost);
  var G = a1_(labor, lc.paid);
  var m = labor.getRange(r, col_(labor, lc.month));
  var f1 = '=IF(' + A + r + '="","",DATE(YEAR(' + A + r + '),MONTH(' + A + r + '),1))';
  if (m.getFormula() !== f1) m.setFormula(f1);
  var b = labor.getRange(r, col_(labor, lc.bal));
  var f2 = '=IF(' + D + r + '="","",MAX(' + D + r + '-N(' + G + r + '),0))';
  if (b.getFormula() !== f2) b.setFormula(f2);
}

// --------------------------------------------------------- commission side
function upsertCommission_(ss, invoice, agg) {
  var sheet = need_(ss, CFG.sheets.commission);
  var hc = CFG.h.comm;
  var cType = col_(sheet, hc.type);
  var cInv = col_(sheet, hc.inv);
  var last = sheet.getLastRow();
  var found = 0;
  if (last >= CFG.firstDataRow) {
    var vals = sheet.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, sheet.getLastColumn()).getValues();
    var key = normKey_(invoice);
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][cType - 1]).trim() === 'Commission' && normKey_(vals[i][cInv - 1]) === key) {
        found = CFG.firstDataRow + i;
        break;
      }
    }
  }
  if (!agg.hasAmount && !found) return;
  var r = found;
  if (!r) {
    r = lastPopulatedRow_(sheet) + 1;
    if (r < CFG.firstDataRow) r = CFG.firstDataRow;
  }
  setCell_(sheet, r, hc.type, 'Commission');
  setCell_(sheet, r, hc.inv, invoiceValue_(invoice));
  if (isBlank_(sheet, r, hc.date)) setCell_(sheet, r, hc.date, agg.date || new Date());
  if (isBlank_(sheet, r, hc.cust) && agg.customer) setCell_(sheet, r, hc.cust, agg.customer);
  setCell_(sheet, r, hc.invtot, agg.invoiceTotal);
  var preTaxProfit = (Number(agg.grossProfit) || 0) - (Number(agg.tax) || 0);
  setCell_(sheet, r, hc.profit, preTaxProfit);
  var B = a1_(sheet, hc.type);
  var F = a1_(sheet, hc.profit);
  var rate = settingCellA1_('Commission Rate');
  sheet.getRange(r, col_(sheet, hc.earned)).setFormula(
    '=IF(' + B + r + '<>"Commission","",IF(' + F + r + '="","",ROUNDUP(MAX(0,' + F + r + ')*N(' + rate + '),0)))');
  applyRunningCommission_(sheet, r);
}

function handleCommissionEdit_(sheet, range) {
  var hc = CFG.h.comm;
  var r1 = Math.max(range.getRow(), CFG.firstDataRow + 1);
  var r2 = range.getLastRow();
  if (r2 <= CFG.firstDataRow && range.getRow() <= CFG.firstDataRow) return;
  withLock_(function () {
    for (var r = r1; r <= r2; r++) {
      var type = String(valueAt_(sheet, r, hc.type) || '').trim();
      var pay = valueAt_(sheet, r, hc.paid);
      if (type === 'Payment' || (pay !== '' && pay !== null)) {
        setCell_(sheet, r, hc.type, 'Payment');
        [hc.inv, hc.invtot, hc.profit, hc.earned].forEach(function (label) {
          sheet.getRange(r, col_(sheet, label)).clearContent();
        });
      } else if (type === 'Commission') {
        var inv = String(valueAt_(sheet, r, hc.inv) || '').trim();
        if (inv && !isTotals_(inv)) syncInvoice_(inv, CFG.sheets.commission, r);
      }
      if (lastPopulatedRow_(sheet) >= r) applyRunningCommission_(sheet, r);
    }
  });
}

function applyRunningCommission_(sheet, r) {
  var hc = CFG.h.comm;
  if (r < CFG.firstDataRow + 1) return;
  var run = a1_(sheet, hc.run);
  var H = a1_(sheet, hc.earned);
  var I = a1_(sheet, hc.paid);
  var A = a1_(sheet, hc.date);
  sheet.getRange(r, col_(sheet, hc.run)).setFormula(
    '=IF(COUNTA(' + A + r + ':' + I + r + ')=0,"",N(' + run + (r - 1) + ')+N(' + H + r + ')-N(' + I + r + '))');
}

// -------------------------------------------------------------- card side
function handleCardEdit_(sheet, range) {
  var hc = CFG.h.card;
  var r1 = Math.max(range.getRow(), CFG.firstDataRow + 1);
  var r2 = range.getLastRow();
  for (var r = r1; r <= r2; r++) {
    var any = false;
    [hc.date, hc.desc, hc.charge, hc.pay].forEach(function (label) {
      if (!isBlank_(sheet, r, label)) any = true;
    });
    if (!any) continue;
    applyCardFormulas_(sheet, r);
  }
}

function applyCardFormulas_(sheet, r) {
  var hc = CFG.h.card;
  var C = a1_(sheet, hc.charge);
  var D = a1_(sheet, hc.pay);
  var E = a1_(sheet, hc.chg);
  var F = a1_(sheet, hc.run);
  var A = a1_(sheet, hc.date);
  sheet.getRange(r, col_(sheet, hc.chg)).setFormula(
    '=IF(COUNTA(' + A + r + ':' + D + r + ')=0,"",N(' + C + r + ')-N(' + D + r + '))');
  sheet.getRange(r, col_(sheet, hc.run)).setFormula(
    '=IF(' + E + r + '="","",N(' + F + (r - 1) + ')+' + E + r + ')');
}

// -------------------------------------------------------- bills due side
function handleDuesEdit_(sheet, range) {
  var hd = CFG.h.dues;
  var r1 = Math.max(range.getRow(), CFG.firstDataRow);
  var r2 = range.getLastRow();
  for (var r = r1; r <= r2; r++) {
    if (isBlank_(sheet, r, hd.name) && isBlank_(sheet, r, hd.amount)) continue;
    refreshDueRow_(sheet, r);
  }
}

function refreshDueRow_(sheet, r) {
  var hd = CFG.h.dues;
  var F = a1_(sheet, hd.amount);
  var G = a1_(sheet, hd.paidso);
  sheet.getRange(r, col_(sheet, hd.rem)).setFormula(
    '=IF(' + F + r + '="","",MAX(0,N(' + F + r + ')-N(' + G + r + ')))');
  var due = Number(valueAt_(sheet, r, hd.amount)) || 0;
  var paid = Number(valueAt_(sheet, r, hd.paidso)) || 0;
  var status = paid <= 0.004 ? 'DUE' : (due - paid <= 0.004 ? 'PAID' : 'PARTIAL');
  setCell_(sheet, r, hd.status, status);
  if (status !== 'PAID' && !isBlank_(sheet, r, hd.paidoff)) {
    sheet.getRange(r, col_(sheet, hd.paidoff)).clearContent();
  }
}

// ====================================================== PHONE APP BACKEND
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Print Shop Log')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function getAppData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sb = sherrieBalances_(ss);
  return {
    bills: billCategories_(ss),
    debts: debtBalances_(ss),
    projects: recentProjects_(ss),
    dues: openDues_(ss),
    commissionOwed: sb.commission,
    cardOwed: sb.card,
    memoOwed: memoBalance_(ss)
  };
}

function sherrieBalances_(ss) {
  var out = { commission: 0, card: 0 };
  try {
    var sheet = ss.getSheetByName('Sherrie Summary');
    var last = sheet.getLastRow();
    var vals = sheet.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, 2).getValues();
    vals.forEach(function (r) {
      var label = String(r[0] || '').trim();
      if (label === 'Commission Still Owed') out.commission = Number(r[1]) || 0;
      if (label === 'Reimbursements Still Owed') out.card = Number(r[1]) || 0;
    });
  } catch (e) { }
  return out;
}

function billCategories_(ss) {
  return ['Rent', 'PGE', 'Insurance', 'Other'];
}

function memoBalance_(ss) {
  var total = 0;
  try {
    var sheet = ss.getSheetByName(CFG.sheets.labor);
    var lc = CFG.h.labor;
    var last = sheet.getLastRow();
    if (last < CFG.firstDataRow) return 0;
    var n = last - CFG.firstDataRow + 1;
    var notes = sheet.getRange(CFG.firstDataRow, col_(sheet, lc.notes), n, 1).getValues();
    var bals = sheet.getRange(CFG.firstDataRow, col_(sheet, lc.bal), n, 1).getValues();
    for (var i = 0; i < n; i++) {
      if (/^memo/i.test(String(notes[i][0] || '').trim())) total += Number(bals[i][0]) || 0;
    }
  } catch (e) { }
  return Math.round(total * 100) / 100;
}

function debtBalances_(ss) {
  var out = [];
  try {
    var sheet = ss.getSheetByName(CFG.sheets.debt);
    var cType = col_(sheet, CFG.h.debtT.type);
    var cRem = col_(sheet, CFG.h.debtT.rem);
    var last = sheet.getLastRow();
    for (var r = CFG.firstDataRow; r <= last; r++) {
      var name = String(sheet.getRange(r, cType).getValue() || '').trim();
      if (name) {
        out.push({
          key: name.toLowerCase().replace(/\s+/g, '_'),
          label: name,
          balance: Number(sheet.getRange(r, cRem).getValue()) || 0
        });
      }
    }
  } catch (e) { }
  return out;
}

function recentEmployees_(ss) {
  var names = [];
  try {
    var sheet = ss.getSheetByName(CFG.sheets.log);
    var last = sheet.getLastRow();
    if (last < CFG.firstDataRow) return names;
    var vals = sheet.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, 5).getValues();
    vals.forEach(function (r) {
      if (String(r[3]) === 'Memo (Employee)' && r[4] && names.indexOf(String(r[4])) === -1) names.push(String(r[4]));
    });
  } catch (e) { }
  return names.slice(-8).reverse();
}

function recentProjects_(ss) {
  var out = [];
  try {
    var sheet = ss.getSheetByName(CFG.sheets.jobs);
    var c = col_(sheet, CFG.h.jobs.cust);
    var last = sheet.getLastRow();
    if (last < CFG.firstDataRow) return out;
    var seen = {};
    sheet.getRange(CFG.firstDataRow, c, last - CFG.firstDataRow + 1, 1).getValues().forEach(function (r) {
      var n = String(r[0] || '').trim();
      if (n && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; out.push(n); }
    });
  } catch (e) { }
  return out.slice(-40);
}

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

function saveEntry(entry) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = '';
  try {
    var d = parseDate_(entry.date);
    var amount = Number(entry.amount) || 0;
    var balanceDue = Number(entry.balanceDue) || 0;
    var newBalance = null;
    var jobCreated = false;
    var remaining = null;

    if (entry.type === 'invoice_payment') {
      var pr = recordInvoicePayment_(ss, {
        invoice: entry.invoice,
        method: entry.method,
        tax: entry.tax,
        customer: entry.customer,
        sale: entry.invoiceTotal,
        payAdd: amount,
        amount: amount,
        date: entry.date,
        source: 'App'
      });
      return { ok: true, summary: pr.summary };
    } else if (entry.type === 'due_add') {
      summary = addDue_(ss, entry, d, amount);
    } else if (entry.type === 'due_pay') {
      var res = payDue_(ss, entry, d, amount);
      summary = res.summary;
      remaining = res.remaining;
    } else if (entry.type === 'cost') {
      var costs = need_(ss, CFG.sheets.costs);
      var cc = CFG.h.costs;
      var r = nextBlankRow_(costs, col_(costs, cc.inv), col_(costs, cc.date));
      setCell_(costs, r, cc.date, d);
      if (entry.invoice) setCell_(costs, r, cc.inv, invoiceValue_(entry.invoice));
      setCell_(costs, r, cc.cust, entry.project || '');
      setCell_(costs, r, cc.type, entry.costType || 'Product / Material');
      setCell_(costs, r, cc.vendor, entry.vendor || '');
      setCell_(costs, r, cc.desc, String(entry.work || '').toUpperCase() + (entry.note ? ' - ' + entry.note : ''));
      setCell_(costs, r, cc.amount, amount);
      if (entry.paid) {
        setCell_(costs, r, cc.paid, 'Yes');
        setCell_(costs, r, cc.paydate, d);
      } else {
        setCell_(costs, r, cc.paid, 'No');
      }
      SpreadsheetApp.flush();
      if (entry.invoice && !isTotals_(entry.invoice)) {
        var ssJobs = need_(ss, CFG.sheets.jobs);
        jobCreated = !findRows_(ssJobs, col_(ssJobs, CFG.h.jobs.inv), entry.invoice).length;
        syncInvoice_(entry.invoice, CFG.sheets.costs, r);
      }
      summary = 'Cost - ' + (entry.vendor || '') + ' - ' + (entry.project || '') +
        (entry.invoice ? ' - Job #' + entry.invoice : '') + (jobCreated ? ' - NEW JOB CREATED' : '');
    } else if (entry.type === 'pay_commission') {
      var ct = need_(ss, CFG.sheets.commission);
      var hcc = CFG.h.comm;
      var pr2 = lastPopulatedRow_(ct) + 1;
      if (pr2 < CFG.firstDataRow) pr2 = CFG.firstDataRow;
      setCell_(ct, pr2, hcc.date, d);
      setCell_(ct, pr2, hcc.type, 'Payment');
      setCell_(ct, pr2, hcc.cust, 'Paid to Sherrie' + (entry.note ? ' - ' + entry.note : ''));
      setCell_(ct, pr2, hcc.paid, amount);
      applyRunningCommission_(ct, pr2);
      summary = 'Sherrie paid (commission) - $' + amount.toFixed(2);
    } else if (entry.type === 'pay_card') {
      var cp = need_(ss, CFG.sheets.card);
      var hcp = CFG.h.card;
      var cr2 = lastPopulatedRow_(cp) + 1;
      if (cr2 < CFG.firstDataRow) cr2 = CFG.firstDataRow;
      setCell_(cp, cr2, hcp.date, d);
      setCell_(cp, cr2, hcp.desc, 'Reimbursement to Sherrie' + (entry.note ? ' - ' + entry.note : ''));
      setCell_(cp, cr2, hcp.pay, amount);
      applyCardFormulas_(cp, cr2);
      summary = 'Sherrie paid (card reimbursement) - $' + amount.toFixed(2);
    } else if (entry.type === 'memo') {
      var labor = need_(ss, CFG.sheets.labor);
      var lc = CFG.h.labor;
      var remainingPay = amount;
      var appliedOld = 0;
      var lastL = labor.getLastRow();
      if (lastL >= CFG.firstDataRow && remainingPay > 0) {
        var nL = lastL - CFG.firstDataRow + 1;
        var notesV = labor.getRange(CFG.firstDataRow, col_(labor, lc.notes), nL, 1).getValues();
        var costV = labor.getRange(CFG.firstDataRow, col_(labor, lc.cost), nL, 1).getValues();
        var paidV = labor.getRange(CFG.firstDataRow, col_(labor, lc.paid), nL, 1).getValues();
        for (var li = 0; li < nL && remainingPay > 0.004; li++) {
          if (!/^memo/i.test(String(notesV[li][0] || '').trim())) continue;
          var owed = (Number(costV[li][0]) || 0) - (Number(paidV[li][0]) || 0);
          if (owed <= 0.004) continue;
          var pay = Math.min(owed, remainingPay);
          setCell_(labor, CFG.firstDataRow + li, lc.paid, (Number(paidV[li][0]) || 0) + pay);
          remainingPay = Math.round((remainingPay - pay) * 100) / 100;
          appliedOld = Math.round((appliedOld + pay) * 100) / 100;
        }
      }
      if (remainingPay > 0.004 || balanceDue > 0.004) {
        var lr = nextBlankRow_(labor, col_(labor, lc.date));
        setCell_(labor, lr, lc.date, d);
        setCell_(labor, lr, lc.cost, Math.round((remainingPay + balanceDue) * 100) / 100);
        setCell_(labor, lr, lc.type, 'Job');
        setCell_(labor, lr, lc.notes, 'Memo' + (entry.note ? ' - ' + entry.note : ''));
        if (remainingPay > 0.004) setCell_(labor, lr, lc.paid, remainingPay);
        applyLaborFormulas_(labor, lr);
      }
      SpreadsheetApp.flush();
      var owedNow = memoBalance_(ss);
      summary = 'Memo - paid $' + amount.toFixed(2) +
        (appliedOld > 0.004 ? ' ($' + appliedOld.toFixed(2) + ' went to the old balance)' : '') +
        (balanceDue > 0.004 ? ' - added $' + balanceDue.toFixed(2) + ' to balance' : '') +
        ' - Memo is now owed $' + owedNow.toFixed(2);
    } else {
      var category;
      var noteOut = entry.note || '';
      if (entry.type === 'bill') {
        category = entry.bill || 'Other Overhead';
        summary = 'Bill - ' + category;
      } else if (entry.type === 'debt') {
        var map = { back_rent: 'Back Rent Payment', back_taxes: 'Back Tax Payment', utility_arrears: 'Utility Arrears Payment' };
        category = map[entry.debtKey] || 'Back Rent Payment';
        summary = 'Debt - ' + category;
      } else if (entry.type === 'admin') {
        category = 'Other Overhead';
        noteOut = 'Admin' + (entry.note ? ' - ' + entry.note : '');
        summary = 'Sherrie (Admin)';
      } else {
        category = (entry.kind === 'savings') ? 'Savings' : 'Owner Draw';
        summary = category;
      }
      if (balanceDue > 0) {
        noteOut = (noteOut ? noteOut + ' - ' : '') + 'BALANCE DUE: $' + balanceDue.toFixed(2);
        summary += ' - owes $' + balanceDue.toFixed(2);
      }
      writeOverhead_(ss, d, category, amount, noteOut);
      if (entry.type === 'debt') {
        debtBalances_(ss).forEach(function (x) { if (x.key === entry.debtKey) newBalance = x.balance; });
      }
    }

    log_(ss, entry, d, amount, summary, 'OK');
    notify_(summary, amount, entry, newBalance);
    return { ok: true, summary: summary, newBalance: newBalance, jobCreated: jobCreated, remaining: remaining };
  } catch (err) {
    try { log_(ss, entry, new Date(), Number(entry.amount) || 0, summary || 'save failed', 'ERROR: ' + err.message); } catch (e2) { }
    throw new Error('That entry could not be saved: ' + err.message + ' Nothing was double-posted - check the App Log tab.');
  } finally {
    lock.releaseLock();
  }
}

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

function addDue_(ss, entry, d, amount) {
  var sheet = need_(ss, CFG.sheets.dues);
  var hd = CFG.h.dues;
  var r = nextBlankRow_(sheet, col_(sheet, hd.name), col_(sheet, hd.added));
  setCell_(sheet, r, hd.added, new Date());
  if (entry.dueDate) setCell_(sheet, r, hd.due, parseDate_(entry.dueDate));
  setCell_(sheet, r, hd.name, entry.name || '');
  setCell_(sheet, r, hd.kind, entry.kind || 'Bill');
  if (entry.invoice) setCell_(sheet, r, hd.inv, invoiceValue_(entry.invoice));
  setCell_(sheet, r, hd.amount, amount);
  setCell_(sheet, r, hd.paidso, 0);
  if (entry.note) setCell_(sheet, r, hd.note, entry.note);
  refreshDueRow_(sheet, r);
  return 'Due added - ' + (entry.name || '') + ' - $' + amount.toFixed(2) +
    (entry.dueDate ? ' - due ' + entry.dueDate : '') +
    (entry.invoice ? ' - Job #' + entry.invoice : '');
}

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

function payDue_(ss, entry, d, amount) {
  var sheet = need_(ss, CFG.sheets.dues);
  var hd = CFG.h.dues;
  var r = Number(entry.row);
  if (!r || r < CFG.firstDataRow || r > sheet.getLastRow() ||
      String(valueAt_(sheet, r, hd.name) || '').trim() !== String(entry.name || '').trim()) {
    throw new Error('the Bills Due list changed. Refresh the app and try again.');
  }
  var due = Number(valueAt_(sheet, r, hd.amount)) || 0;
  var paidSo = (Number(valueAt_(sheet, r, hd.paidso)) || 0) + amount;
  setCell_(sheet, r, hd.paidso, paidSo);
  var remaining = Math.max(0, Math.round((due - paidSo) * 100) / 100);
  refreshDueRow_(sheet, r);
  if (remaining <= 0.004) setCell_(sheet, r, hd.paidoff, d);

  var kind = String(valueAt_(sheet, r, hd.kind) || 'Bill');
  var inv = String(valueAt_(sheet, r, hd.inv) || '').trim();
  var name = String(valueAt_(sheet, r, hd.name) || '');
  var tail = remaining > 0 ? ' - still owes $' + remaining.toFixed(2) : ' - PAID OFF';

  if (/^debt$/i.test(kind)) {
    var cat = /rent/i.test(name) ? 'Back Rent Payment' : /tax/i.test(name) ? 'Back Tax Payment' :
      /utilit/i.test(name) ? 'Utility Arrears Payment' : 'Back Rent Payment';
    writeOverhead_(ss, d, cat, amount, 'Due-list payment - ' + name + (entry.note ? ' - ' + entry.note : ''));
    return { summary: 'Paid debt due - ' + name + tail, remaining: remaining };
  }
  if (inv && !isTotals_(inv)) {
    var costs = need_(ss, CFG.sheets.costs);
    var cc = CFG.h.costs;
    var rows = findRows_(costs, col_(costs, cc.inv), inv);
    var target = 0;
    rows.forEach(function (cr) {
      if (target) return;
      var paid = String(valueAt_(costs, cr, cc.paid) || '').toLowerCase();
      var vend = String(valueAt_(costs, cr, cc.vendor) || '').toLowerCase();
      if (paid !== 'yes' && (!name || !vend || vend === name.toLowerCase() || rows.length === 1)) target = cr;
    });
    if (!target) rows.forEach(function (cr) {
      if (!target && String(valueAt_(costs, cr, cc.paid) || '').toLowerCase() !== 'yes') target = cr;
    });
    if (target) {
      setCell_(costs, target, cc.paid, 'Yes');
      setCell_(costs, target, cc.paydate, d);
    } else {
      var nr = nextBlankRow_(costs, col_(costs, cc.inv), col_(costs, cc.date));
      setCell_(costs, nr, cc.date, d);
      setCell_(costs, nr, cc.inv, invoiceValue_(inv));
      setCell_(costs, nr, cc.vendor, name);
      setCell_(costs, nr, cc.type, 'Other');
      setCell_(costs, nr, cc.desc, 'Paid via Bills Due' + (entry.note ? ' - ' + entry.note : ''));
      setCell_(costs, nr, cc.amount, amount);
      setCell_(costs, nr, cc.paid, 'Yes');
      setCell_(costs, nr, cc.paydate, d);
    }
    SpreadsheetApp.flush();
    syncInvoice_(inv, '', 0);
    return { summary: 'Paid vendor bill - ' + name + ' - Job #' + inv + tail, remaining: remaining };
  }
  writeOverhead_(ss, d, name || 'Other Overhead', amount,
    'Due-list payment' + (entry.note ? ' - ' + entry.note : '') + (remaining > 0 ? ' - STILL OWED: $' + remaining.toFixed(2) : ''));
  return { summary: 'Paid due - ' + name + tail, remaining: remaining };
}

function deleteDue(row, expectedName, expectedKind, expectedRemaining) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = need_(ss, CFG.sheets.dues);
    var hd = CFG.h.dues;
    var r = Number(row);
    if (!r || r < CFG.firstDataRow || r > sheet.getLastRow()) {
      throw new Error('That bill could not be found. Refresh the app and try again.');
    }
    var name = String(valueAt_(sheet, r, hd.name) || '').trim();
    var kind = String(valueAt_(sheet, r, hd.kind) || 'Bill').trim();
    var rem = Math.round(((Number(valueAt_(sheet, r, hd.amount)) || 0) - (Number(valueAt_(sheet, r, hd.paidso)) || 0)) * 100) / 100;
    if (!name || name !== String(expectedName || '').trim() || kind !== String(expectedKind || '').trim() ||
        rem !== Math.round((Number(expectedRemaining) || 0) * 100) / 100) {
      throw new Error('The Bills Due list changed. Refresh the app before deleting.');
    }
    sheet.deleteRow(r);
    SpreadsheetApp.flush();
    return { ok: true, dues: openDues_(ss) };
  } finally {
    lock.releaseLock();
  }
}

function writeOverhead_(ss, d, category, amount, note) {
  var sheet = need_(ss, CFG.sheets.overhead);
  var ho = CFG.h.over;
  var r = nextBlankRow_(sheet, col_(sheet, ho.date));
  setCell_(sheet, r, ho.date, d);
  sheet.getRange(r, col_(sheet, ho.month)).setFormula(
    '=IF(' + a1_(sheet, ho.date) + r + '="","",DATE(YEAR(' + a1_(sheet, ho.date) + r + '),MONTH(' + a1_(sheet, ho.date) + r + '),1))');
  setCell_(sheet, r, ho.cat, category);
  setCell_(sheet, r, ho.amount, amount);
  if (note) setCell_(sheet, r, ho.notes, note);
}

function log_(ss, entry, d, amount, summary, status) {
  var sheet = need_(ss, CFG.sheets.log);
  var labels = { bill: 'Bills Paid', cost: 'Vendor / Garment Cost', debt: 'Debt Paid',
    memo: 'Memo (Employee)', admin: 'Sherrie (Admin)', draw: 'Take Home / Savings',
    due_add: 'Bill / Debt Due - Added', due_pay: 'Bill / Debt Due - Payment',
    pay_commission: 'Sherrie Paid - Commission', pay_card: 'Sherrie Paid - Card Reimbursement',
    invoice_payment: 'Invoice Payment' };
  var who = entry.bill || entry.employee || entry.debtKey || entry.kind || '';
  if (entry.type === 'pay_commission' || entry.type === 'pay_card') who = 'Sherrie';
  if (entry.type === 'memo' && !who) who = 'Memo';
  if (entry.type === 'invoice_payment') who = 'Job #' + (entry.invoice || '') + ' (' + (entry.method || '') + ')';
  if (entry.type === 'cost') who = (entry.vendor || '') + ' -> ' + (entry.project || '');
  if (entry.type === 'due_add' || entry.type === 'due_pay') who = entry.name || '';
  var note = entry.note || '';
  var bal = Number(entry.balanceDue) || 0;
  if (bal > 0) note = (note ? note + ' - ' : '') + 'Balance due: $' + bal.toFixed(2);
  sheet.appendRow([new Date(), d, 'App', labels[entry.type] || entry.type, who, amount, note, summary, status]);
}

function notify_(summary, amount, entry, newBalance) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Shop log: ' + summary + ' - $' + amount.toFixed(2),
      summary + '\nAmount: $' + amount.toFixed(2) + '\nDate: ' + entry.date +
      (entry.note ? '\nNote: ' + entry.note : '') +
      (newBalance !== null ? '\nRemaining balance: $' + newBalance.toFixed(2) : ''));
  } catch (e) { }
}

// ================================================================ SELF-TEST
function runSelfTest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jobs = need_(ss, CFG.sheets.jobs);
  var costs = need_(ss, CFG.sheets.costs);
  var labor = need_(ss, CFG.sheets.labor);
  var comm = need_(ss, CFG.sheets.commission);
  var jc = CFG.h.jobs;
  var cc = CFG.h.costs;
  var lc = CFG.h.labor;
  var hc = CFG.h.comm;
  var rep = [];
  var ok = function (name, cond, detail) {
    rep.push((cond ? 'PASS' : 'FAIL') + ' - ' + name + (detail ? ' (' + detail + ')' : ''));
    return cond;
  };
  var commRowsFor = function (inv) {
    var out = [];
    var last = comm.getLastRow();
    if (last < CFG.firstDataRow) return out;
    var key = normKey_(inv);
    var tCol = col_(comm, hc.type);
    var iCol = col_(comm, hc.inv);
    var vals = comm.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, comm.getLastColumn()).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][tCol - 1]).trim() === 'Commission' && normKey_(vals[i][iCol - 1]) === key) out.push(CFG.firstDataRow + i);
    }
    return out;
  };
  var today = new Date();
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var j1 = nextBlankRow_(jobs, col_(jobs, jc.inv));
    setCell_(jobs, j1, jc.inv, 'ZTEST1');
    setCell_(jobs, j1, jc.date, today);
    setCell_(jobs, j1, jc.cust, 'TEST CO');
    setCell_(jobs, j1, jc.desc, 'PRINTING');
    setCell_(jobs, j1, jc.amount, 500);
    syncInvoice_('ZTEST1', CFG.sheets.jobs, j1);
    SpreadsheetApp.flush();
    var c1 = findRows_(costs, col_(costs, cc.inv), 'ZTEST1');
    var l1 = findRows_(labor, col_(labor, lc.inv), 'ZTEST1');
    var m1 = commRowsFor('ZTEST1');
    var gp1 = Number(valueAt_(jobs, j1, jc.gp)) || 0;
    var earn1 = m1.length ? Number(valueAt_(comm, m1[0], hc.earned)) || 0 : -1;
    ok('T1 Costs row created', c1.length === 1, c1.length + ' row(s)');
    ok('T1 Labor row created at $100', l1.length === 1 && Number(valueAt_(labor, l1[0], lc.cost)) === 100,
      l1.length ? '$' + valueAt_(labor, l1[0], lc.cost) : 'no row');
    ok('T1 Gross Profit = 400', gp1 === 400, 'GP $' + gp1);
    ok('T1 exactly one Commission row, $40 from Gross Profit', m1.length === 1 && earn1 === 40,
      m1.length + ' row(s), $' + earn1);

    var c2 = nextBlankRow_(costs, col_(costs, cc.inv), col_(costs, cc.date));
    setCell_(costs, c2, cc.date, today);
    setCell_(costs, c2, cc.inv, 'ZTEST2');
    setCell_(costs, c2, cc.cust, 'TEST TWO');
    setCell_(costs, c2, cc.type, 'Product / Material');
    setCell_(costs, c2, cc.vendor, 'TESTVEND');
    setCell_(costs, c2, cc.desc, 'GARMENTS');
    setCell_(costs, c2, cc.amount, 80);
    syncInvoice_('ZTEST2', CFG.sheets.costs, c2);
    SpreadsheetApp.flush();
    var j2list = findRows_(jobs, col_(jobs, jc.inv), 'ZTEST2');
    var j2 = j2list.length ? j2list[0] : 0;
    ok('T2 Job created, description left empty', j2 > 0 && isBlank_(jobs, j2, jc.desc),
      j2 ? 'desc="' + valueAt_(jobs, j2, jc.desc) + '"' : 'no job');
    ok('T2 Labor row created', findRows_(labor, col_(labor, lc.inv), 'ZTEST2').length === 1);
    setCell_(jobs, j2, jc.amount, 300);
    syncInvoice_('ZTEST2', CFG.sheets.jobs, j2);
    SpreadsheetApp.flush();
    var gp2 = Number(valueAt_(jobs, j2, jc.gp)) || 0;
    var m2 = commRowsFor('ZTEST2');
    ok('T2 costs flow to Jobs: GP = 120', gp2 === 120, 'GP $' + gp2);
    ok('T2 one Commission row, $12', m2.length === 1 && Number(valueAt_(comm, m2[0], hc.earned)) === 12,
      m2.length + ' row(s), $' + (m2.length ? valueAt_(comm, m2[0], hc.earned) : '-'));

    var l3 = nextBlankRow_(labor, col_(labor, lc.inv), col_(labor, lc.date));
    setCell_(labor, l3, lc.date, today);
    setCell_(labor, l3, lc.inv, 'ZTEST3');
    syncInvoice_('ZTEST3', CFG.sheets.labor, l3);
    SpreadsheetApp.flush();
    var j3list = findRows_(jobs, col_(jobs, jc.inv), 'ZTEST3');
    var j3 = j3list.length ? j3list[0] : 0;
    ok('T3 Job created from Labor', j3 > 0);
    ok('T3 Costs row created', findRows_(costs, col_(costs, cc.inv), 'ZTEST3').length === 1);
    setCell_(jobs, j3, jc.amount, 200);
    syncInvoice_('ZTEST3', CFG.sheets.jobs, j3);
    SpreadsheetApp.flush();
    var m3 = commRowsFor('ZTEST3');
    ok('T3 labor flows to Jobs: GP = 100, commission $10',
      (Number(valueAt_(jobs, j3, jc.gp)) || 0) === 100 && m3.length === 1 &&
      Number(valueAt_(comm, m3[0], hc.earned)) === 10,
      'GP $' + valueAt_(jobs, j3, jc.gp) + ', $' + (m3.length ? valueAt_(comm, m3[0], hc.earned) : '-'));

    var l1row = findRows_(labor, col_(labor, lc.inv), 'ZTEST1')[0];
    setCell_(labor, l1row, lc.cost, 50);
    syncInvoice_('ZTEST1', '', 0);
    SpreadsheetApp.flush();
    var gp4 = Number(valueAt_(jobs, j1, jc.gp)) || 0;
    var m4 = commRowsFor('ZTEST1');
    ok('T4 manual $50 preserved after re-sync', Number(valueAt_(labor, l1row, lc.cost)) === 50,
      '$' + valueAt_(labor, l1row, lc.cost));
    ok('T4 GP recalculated to 450, commission updated to $45, still one row',
      gp4 === 450 && m4.length === 1 && Number(valueAt_(comm, m4[0], hc.earned)) === 45,
      'GP $' + gp4 + ', ' + m4.length + ' row(s), $' + (m4.length ? valueAt_(comm, m4[0], hc.earned) : '-'));

    var c5 = nextBlankRow_(costs, col_(costs, cc.inv), col_(costs, cc.date));
    setCell_(costs, c5, cc.date, today);
    setCell_(costs, c5, cc.inv, 'ZTEST2');
    setCell_(costs, c5, cc.type, 'Product / Material');
    setCell_(costs, c5, cc.amount, 20);
    syncInvoice_('ZTEST2', CFG.sheets.costs, c5);
    SpreadsheetApp.flush();
    var m5 = commRowsFor('ZTEST2');
    ok('T5 no duplicate Job', findRows_(jobs, col_(jobs, jc.inv), 'ZTEST2').length === 1);
    ok('T5 no duplicate Commission, GP now 100, commission $10',
      m5.length === 1 && (Number(valueAt_(jobs, j2, jc.gp)) || 0) === 100 &&
      Number(valueAt_(comm, m5[0], hc.earned)) === 10,
      'GP $' + valueAt_(jobs, j2, jc.gp) + ', ' + m5.length + ' row(s), $' + (m5.length ? valueAt_(comm, m5[0], hc.earned) : '-'));

    var payRow = lastPopulatedRow_(comm) + 1;
    setCell_(comm, payRow, hc.date, today);
    setCell_(comm, payRow, hc.type, 'Payment');
    setCell_(comm, payRow, hc.cust, 'ZTEST payment');
    setCell_(comm, payRow, hc.paid, 100);
    applyRunningCommission_(comm, payRow);
    SpreadsheetApp.flush();
    var j6 = nextBlankRow_(jobs, col_(jobs, jc.inv));
    setCell_(jobs, j6, jc.inv, 'ZTEST4');
    setCell_(jobs, j6, jc.date, today);
    setCell_(jobs, j6, jc.amount, 100);
    syncInvoice_('ZTEST4', CFG.sheets.jobs, j6);
    SpreadsheetApp.flush();
    var m6 = commRowsFor('ZTEST4');
    var payIntact = String(valueAt_(comm, payRow, hc.type)).trim() === 'Payment' &&
      Number(valueAt_(comm, payRow, hc.paid)) === 100 && isBlank_(comm, payRow, hc.inv);
    ok('T6 manual Payment row untouched', payIntact,
      valueAt_(comm, payRow, hc.type) + ' / $' + valueAt_(comm, payRow, hc.paid));
    ok('T6 new Commission appended AFTER the payment row', m6.length === 1 && m6[0] > payRow,
      m6.length ? 'row ' + m6[0] + ' vs payment row ' + payRow : 'no row');

    var toDelete = [];
    ['ZTEST1', 'ZTEST2', 'ZTEST3', 'ZTEST4'].forEach(function (inv) {
      findRows_(jobs, col_(jobs, jc.inv), inv).forEach(function (r) { toDelete.push([jobs, r]); });
      findRows_(costs, col_(costs, cc.inv), inv).forEach(function (r) { toDelete.push([costs, r]); });
      findRows_(labor, col_(labor, lc.inv), inv).forEach(function (r) { toDelete.push([labor, r]); });
      commRowsFor(inv).forEach(function (r) { toDelete.push([comm, r]); });
    });
    toDelete.push([comm, payRow]);
    toDelete.sort(function (a, b) { return b[1] - a[1]; });
    toDelete.forEach(function (d) { d[0].deleteRow(d[1]); });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  var fails = rep.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
  var report = (fails === 0 ? 'ALL 6 TESTS PASSED' : fails + ' CHECK(S) FAILED') +
    '\n(test rows were cleaned up automatically)\n\n' + rep.join('\n');
  try { SpreadsheetApp.getUi().alert('Self-test results', report, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { }
  Logger.log(report);
  return report;
}

// ---------------------------------------------------------------- helpers
var _colCache = {};

function col_(sheet, label) {
  var key = sheet.getSheetId() + '|' + label;
  if (_colCache[key]) return _colCache[key];
  var headers = sheet.getRange(CFG.headerRow, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === label) { _colCache[key] = i + 1; return i + 1; }
  }
  throw new Error('The column "' + label + '" is missing on the "' + sheet.getName() + '" tab. Restore the header in row 3.');
}

function a1_(sheet, label) {
  var c = col_(sheet, label);
  var s = '';
  while (c > 0) {
    s = String.fromCharCode(65 + (c - 1) % 26) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

function valueAt_(sheet, row, label) { return sheet.getRange(row, col_(sheet, label)).getValue(); }
function displayAt_(sheet, row, colNum) { return String(sheet.getRange(row, colNum).getDisplayValue() || '').trim(); }

function isBlank_(sheet, row, label) {
  var v = valueAt_(sheet, row, label);
  return v === '' || v === null;
}

function setCell_(sheet, row, label, value) { sheet.getRange(row, col_(sheet, label)).setValue(value); }

function fillIfBlank_(sheet, row, label, value) {
  if (value === '' || value === null || value === undefined) return;
  if (isBlank_(sheet, row, label)) setCell_(sheet, row, label, value);
}

function findRows_(sheet, colNum, invoice) {
  var out = [];
  var last = sheet.getLastRow();
  if (last < CFG.firstDataRow) return out;
  var key = normKey_(invoice);
  var vals = sheet.getRange(CFG.firstDataRow, colNum, last - CFG.firstDataRow + 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (normKey_(vals[i][0]) === key) out.push(CFG.firstDataRow + i);
  }
  return out;
}

function nextBlankRow_(sheet, keyCol, altCol) {
  var last = Math.max(sheet.getLastRow(), CFG.firstDataRow);
  var vals = sheet.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var a = String(vals[i][keyCol - 1] == null ? '' : vals[i][keyCol - 1]).trim();
    var b = altCol ? String(vals[i][altCol - 1] == null ? '' : vals[i][altCol - 1]).trim() : '';
    if (!a && !b) return CFG.firstDataRow + i;
  }
  return last + 1;
}

function lastPopulatedRow_(sheet) {
  var last = sheet.getLastRow();
  if (last < CFG.firstDataRow) return CFG.firstDataRow - 1;
  var vals = sheet.getRange(CFG.firstDataRow, 1, last - CFG.firstDataRow + 1, sheet.getLastColumn()).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    for (var j = 0; j < vals[i].length; j++) {
      if (vals[i][j] !== '' && vals[i][j] !== null) return CFG.firstDataRow + i;
    }
  }
  return CFG.firstDataRow - 1;
}

function normKey_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase().replace(/\s+/g, ' ');
  s = s.replace(/^INV[-\s]*/, '');
  if (/^\d+(\.0+)?$/.test(s)) s = String(parseInt(s, 10));
  return s;
}

function isTotals_(v) { return normKey_(v) === 'TOTALS'; }

function invoiceValue_(v) {
  var s = String(v == null ? '' : v).trim().replace(/^INV[-\s]*/i, '');
  return /^\d+(\.0+)?$/.test(s) ? parseInt(s, 10) : s;
}

function settingCellA1_(label) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = need_(ss, CFG.sheets.inputs);
  var last = sheet.getLastRow();
  var vals = sheet.getRange(CFG.firstDataRow, 1, Math.max(last - CFG.firstDataRow + 1, 1), 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === label) return CFG.sheets.inputs + '!$B$' + (CFG.firstDataRow + i);
  }
  throw new Error('The setting "' + label + '" is missing on the Inputs tab.');
}

function setting_(label, fallback) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.sheets.inputs);
  if (!sheet) return fallback;
  var last = sheet.getLastRow();
  var vals = sheet.getRange(CFG.firstDataRow, 1, Math.max(last - CFG.firstDataRow + 1, 1), 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === label) return vals[i][1];
  }
  return fallback;
}

function parseDate_(s) {
  var p = String(s || '').split('-');
  if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return new Date();
}

function need_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Required tab not found: ' + name);
  return sheet;
}

function withLock_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) return;
  try { fn(); } finally { lock.releaseLock(); }
}

function friendlyError_(where, err) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast(where + ' hit a problem: ' + err.message, 'My Shirt Tools', 8);
    var sheet = ss.getSheetByName(CFG.sheets.log);
    if (sheet) sheet.appendRow([new Date(), new Date(), 'Sheet', where, '', '', '', err.message, 'ERROR: ' + err.message]);
  } catch (e) { }
}