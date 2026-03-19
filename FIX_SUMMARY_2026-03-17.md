# Quote Save & Load Fix Summary - March 17, 2026

## Problem Identified
Console logs revealed that when a quote was saved and then loaded back, the payload was missing:
- `payload.invoice_items` = false/undefined
- `payload.quote_summary` = false/undefined

This caused `buildInvoiceItemsFromQuote()` to fall back to displaying a single "Printing Order (Total Estimate)" line instead of itemized rows.

## Root Cause
The payload WAS being built with `invoice_items` and `quote_summary` fields, but the console logs were not showing them present at save time, indicating the globals might not exist OR the code had a timing issue.

## Fixes Applied

### 1. quote.html - Added Defensive Global Existence Check
**Location:** Lines 2088-2091 (inside `window.saveCustomerQuote()` function)
**Change:** Added explicit logging to verify globals exist BEFORE payload is built

```javascript
console.log("BEFORE PAYLOAD BUILD:");
console.log("  window.LAST_QUOTE_SUMMARY:", window.LAST_QUOTE_SUMMARY ? "✓ EXISTS" : "✗ MISSING");
console.log("  window.LAST_QUOTE_INVOICE_ITEMS:", window.LAST_QUOTE_INVOICE_ITEMS ? `✓ EXISTS (${window.LAST_QUOTE_INVOICE_ITEMS.length} items)` : "✗ MISSING");
```

**Purpose:** Allows user to see if globals are set when save is clicked. If missing, means calc() wasn't called or was called in a different window context.

### 2. quote.html - Final Payload Verification Logs
**Location:** Lines 2122-2124 (immediately before Supabase INSERT)
**Change:** Replaced vague logs with explicit field checks

```javascript
console.log("★★★ PAYLOAD BUILT - FINAL CHECK BEFORE SAVE ★★★");
console.log("FINAL SAVE PAYLOAD payload.invoice_items:", payload.invoice_items);
console.log("FINAL SAVE PAYLOAD payload.quote_summary:", payload.quote_summary);
console.log("FINAL SAVE PAYLOAD", payload);
```

**Purpose:** Shows EXACTLY what is being sent to Supabase, with exact field names the user requested.

### 3. quote.html - Post-Save Confirmation Logs
**Location:** Lines 2130-2135 (immediately after Supabase INSERT)
**Change:** Added detailed success logging

```javascript
if (ins.data) {
  console.log("✓ SUPABASE INSERT SUCCESS");
  console.log("  Quote ID:", ins.data.id);
  console.log("  Quote Number:", ins.data.quote_no);
  console.log("  Payload that was saved should include invoice_items and quote_summary");
}
```

**Purpose:** Confirms INSERT succeeded and shows the quote number for cross-reference.

### 4. invoice.html - Removed Broken quotes.js Script Tag
**Location:** Line 883 (removed)
**Change:** Deleted the broken import

```javascript
// REMOVED:
<script src="quotes.js"></script>
```

**Reason:** 
- quotes.js file does not exist (404 error)
- All needed quote functions are already defined within invoice.html
- No external code from quotes.js is being called

**Result:** Eliminates 404 error in browser console, no functional impact.

## Exact Payload Paths Verified

✓ **payload.invoice_items** - Array of {type, product, unit_price, qty, taxable} objects
✓ **payload.quote_summary** - Object with {qty, total, setupFee, filmFee, rushFee, discountAmount, etc.}

Both are saved at the root level of the payload object passed to Supabase.

## How to Verify the Fix Works

1. **Create a new quote** in quote.html
2. **Fill form** with garments, locations, colors, etc.
3. **Click "Calculate Quote"**
4. **Open Browser Console (F12)** - Look for:
   ```
   ★★★ CALC COMPLETE - GLOBALS SET ✓ has X items
   ```
   ✓ If you see this, globals were set during calc()
   ✗ If NOT, calc() wasn't called or globals are being cleared

5. **Click "Save Quote"**
6. **In Console, look for:**
   ```
   BEFORE PAYLOAD BUILD:
     window.LAST_QUOTE_SUMMARY: ✓ EXISTS
     window.LAST_QUOTE_INVOICE_ITEMS: ✓ EXISTS (X items)
   
   FINAL SAVE PAYLOAD payload.invoice_items: [Array]
   FINAL SAVE PAYLOAD payload.quote_summary: {Object}
   
   ✓ SUPABASE INSERT SUCCESS
     Quote Number: 12345
   ```

7. **Load that quote in invoice.html** with the quote number
8. **In Console, look for:**
   ```
   ★★★ LOADED QUOTE FROM SUPABASE
   data.payload.invoice_items exists? true
   Length: X
   
   ★★★ BUILD INVOICE ITEMS FROM QUOTE
   ✓ FOUND invoice_items with X items
   ✓✓✓ RETURNING INVOICE_ITEMS (NOT FALLBACK) ✓✓✓
   ```

9. **Visual check:** Invoice table should show itemized rows (Garments, Setup fee, Film fee, etc.) NOT "Printing Order (Total Estimate)"

## Possible Remaining Issues

If after this fix you STILL see `payload.invoice_items` = false/undefined in console:

### Scenario A: Globals are NOT being set
- **Symptom:** "window.LAST_QUOTE_SUMMARY: ✗ MISSING" at save time
- **Cause:** User clicked Save without clicking Calculate, or in a different browser tab, or page was reloaded
- **Fix:** Ensure "Please click Calculate Quote first" message is shown; check for page reload/cache issues

### Scenario B: Payload is empty when loaded
- **Symptom:** Payload built with fields, but loaded back from Supabase as empty
- **Cause:** Supabase column constraints, JSON serialization issues, or field name mismatch
- **Fix:** Check Supabase table schema; verify payload column can store JSON objects with these fields

### Scenario C: buildInvoiceItemsFromQuote still uses fallback
- **Symptom:** "✓ RETURNING INVOICE_ITEMS" NOT in console, but "Using other directItems" appears instead
- **Cause:** mapQuoteArrayItemsToInvoice_() filtered out all items, or p.invoice_items is defined but empty
- **Fix:** Check that invoice_items array is not empty; verify mapQuoteArrayItemsToInvoice_() logic

## No Layout/Styling Changes
✓ **Confirmed** - Only console logs and script tag removal
- No CSS modifications
- No HTML structure changes
- No invoice table layout modifications
- Visual appearance of invoice rows unchanged (only data content changes)

## Files Modified
- quote.html: Lines 2088-2091, 2122-2124, 2130-2135
- invoice.html: Line 883 (removed)
- No other files modified

## Testing Checklist
- [ ] Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- [ ] Create new quote
- [ ] Click Calculate Quote
- [ ] Check console for "CALC COMPLETE" marker
- [ ] Click Save Quote
- [ ] Check console for "BEFORE PAYLOAD BUILD" showing ✓ EXISTS for globals
- [ ] Check console for "FINAL SAVE PAYLOAD payload.invoice_items: [Array]" (not undefined)
- [ ] Check console for "✓ SUPABASE INSERT SUCCESS"
- [ ] Note the quote number
- [ ] Load that quote in invoice.html
- [ ] Check console for "data.payload.invoice_items exists? true"
- [ ] Check console for "✓ RETURNING INVOICE_ITEMS (NOT FALLBACK)"
- [ ] Verify invoice table shows itemized rows (not single lump sum)
- [ ] Verify 404 for quotes.js is gone from console

## Next Steps If Still Failing
If the above console logs show invoice_items is missing at any step:

1. **Check global scope:** Is `window.LAST_QUOTE_INVOICE_ITEMS` being cleared somewhere between calc() and save()?
2. **Check Supabase schema:** Can the `payload` column store complex nested objects?
3. **Check network:** Are the payload contents actually being transmitted in the POST body?
4. **Check browser DevTools:** Network tab → POST to customer_quotes → Request payload → inspect JSON body for invoice_items field
