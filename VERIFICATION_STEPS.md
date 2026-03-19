# Verification: Quote -> Invoice Itemization Chain

## Code Version
These steps verify the **2026-03-17 NEW VERSION** of quote.html and invoice.html

## Step 1: Create and Save a New Quote

1. Open **quote.html** in browser
2. **Open Developer Console** (F12 or Cmd+Option+I)
3. Go to **Console tab** - keep it visible
4. **Fill out the quote form:**
   - Select quantity (e.g., 100)
   - Select garment tone (light or dark)
   - Select locations (e.g., Front Center)
   - Select at least one color
   - Optionally add a discount code or rush
5. **Click "Calculate Quote"** button
   
### Expected Console Output at this point:
```
★★★ CALC FUNCTION CALLED [2026-03-17 NEW VERSION] ★★★
...calculation logs...
✓ CALC COMPLETE - GLOBALS SET
window.LAST_QUOTE_SUMMARY items: ✓ has total: [amount]
window.LAST_QUOTE_INVOICE_ITEMS: ✓ has X items
First invoice item: {type: "Services", product: "Garments print cost", ...}
```

**✓ If you see these logs with checkmarks, the new code is running.**
**✗ If you DON'T see these logs, your browser is still caching the old code. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)**

6. Enter your name and email in the panel
7. **Click "Save Quote"** button

### Expected Console Output when saving:
```
★★★ SAVE CUSTOMER QUOTE FUNCTION CALLED [2026-03-17 NEW VERSION] ★★★
★★★ ABOUT TO SAVE QUOTE TO SUPABASE ★★★
payload.invoice_items: ✓ array with X items
First item: {type: "Services", product: "..."}
payload.quote_summary exists? true (total: [amount])
FULL PAYLOAD being saved: {...invoice_items: [...], quote_summary: {...}}
INSERT RESULT: {data: {id: "...", quote_no: 12345}, error: null}
```

**Note the quote number displayed.** Example: `Saved quote #12345`

---

## Step 2: Load the Quote in invoice.html

1. **Stay in the same browser window/tab** (don't close developer tools)
2. Navigate to **invoice.html**
3. In the **"Load Quote"** section, enter the quote number (e.g., 12345)
4. Click **"Load"** button
5. Watch the **Console tab** for output

### Expected Console Output when loading:
```
★★★ LOADED QUOTE FROM SUPABASE [2026-03-17 NEW VERSION] ★★★
Quote #: 12345
data.payload.invoice_items exists? true
Is array? true
Length: X  (should be same X from save)
First item: {type: "Services", product: "..."}
data.payload.quote_summary exists? true
```

**✓ If invoice_items exists, has items, and matches the save, the data was stored correctly.**
**✗ If invoice_items is `false` or `undefined`, the data was NOT saved.**

---

## Step 3: Verify buildInvoiceItemsFromQuote() Uses invoice_items

After Step 2's load, you should see:
```
★★★ BUILD INVOICE ITEMS FROM QUOTE [2026-03-17 NEW VERSION] ★★★
Looking for invoice_items at: p.invoice_items
p.invoice_items value: [Array with items]
Is array? true
Array length: X
✓ FOUND invoice_items with X items
First item: {...}
After mapping to invoice format: X items
✓✓✓ RETURNING INVOICE_ITEMS (NOT FALLBACK) ✓✓✓
```

**✓ If you see "RETURNING INVOICE_ITEMS" the fix is WORKING.**
**✗ If you see "Using other directItems" or "NO: directItems not found", the fallback is being used - FIX FAILED.**

---

## Step 4: Verify Invoice Rows Are Itemized (Visual Check)

In invoice.html, look at the invoice table:

**CORRECT (itemized):**
```
| Garments (100 pcs)           | $5,000.00 |
| Garments print cost          | $2,500.00 |
| Setup fee ($X per screen)    |   $100.00 |
| Film fee (X films @ $15)     |    $30.00 |
| Rush (+35%)                  |   $264.00 |
| Discount (CODE)              |  -$500.00 |
-----------------------------------------
| TOTAL                        | $7,394.00 |
```

**WRONG (lump-sum fallback):**
```
| Printing Order (Total Estimate) | $7,394.00 |
-----------------------------------------
| TOTAL                           | $7,394.00 |
```

---

## Troubleshooting

### "Nothing changed - still shows lump-sum"

1. **Check browser cache:**
   - Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
   - Or: Open DevTools > Settings > Network > Check "Disable cache"

2. **Check console for the NEW VERSION markers (★★★):**
   - If you don't see them, the old code is running
   - If you DO see them but invoice_items is missing, it's a data issue (see below)

3. **Check if invoice_items is saved to Supabase:**
   - At save time, look for: `payload.invoice_items: ✓ array with X items`
   - If this shows `✗ missing or empty`, the save code isn't working

4. **Check if invoice_items is loaded from Supabase:**
   - At load time, look for: `data.payload.invoice_items exists? true`
   - If this shows `false`, Supabase isn't storing it

### "I see invoice_items in logs but still getting lump-sum in the table"

This means `buildInvoiceItemsFromQuote()` found invoice_items but is still using fallback.
- Check console for: "After mapping to invoice format: X items"
- If X is 0, the mapping function is filtering out all items
- Check `mapQuoteArrayItemsToInvoice_()` function

### Console logs not visible

1. Make sure Console tab is open
2. Scroll to the top of console (logs appear at time of action)
3. Look for the **★★★** markers - they're the new code
4. Hard refresh if you don't see them

---

## Expected Payload Structure

The saved quote payload should include:

```javascript
{
  qty: "100",
  garment_tone: "light",
  rush: "",
  discount_code: "",
  locations: ["Front Center"],
  // ... other fields ...
  total_estimate: "$7,394.00",
  garments: { lines: [...], subtotal_cents: 500000 },
  garments_subtotal_cents: 5000,
  
  // NEW FIELDS:
  quote_summary: {
    qty: 100,
    total: 7394,
    setupFee: 100,
    filmFee: 30,
    rushFee: 264,
    discountAmount: 500,
    // ... other summary fields ...
  },
  
  invoice_items: [
    { type: "Services", product: "Garments print cost", unit_price: 2500, qty: 1, taxable: true },
    { type: "Services", product: "Setup fee ($X per screen)", unit_price: 100, qty: 1, taxable: true },
    { type: "Services", product: "Film fee (X films @ $15)", unit_price: 30, qty: 1, taxable: true },
    { type: "Services", product: "Rush (+35%)", unit_price: 264, qty: 1, taxable: true },
    { type: "Discount", product: "Discount (CODE)", unit_price: -500, qty: 1, taxable: false }
  ]
}
```

---

## What Was Changed

### quote.html
- **Line 1075-1141**: `buildQuoteInvoiceItems_()` function creates array of invoice line items from quote calculation
- **Line 1362**: Sets `window.LAST_QUOTE_INVOICE_ITEMS` = result of buildQuoteInvoiceItems_()
- **Line 2107-2109**: Saves `invoice_items` and `quote_summary` to payload before Supabase INSERT

### invoice.html
- **Line 2055-2090**: `buildInvoiceItemsFromQuote()` FIRST checks for `p.invoice_items` (if exists and has items, returns it)
- **Line 2355-2370**: `loadQuoteByNumber()` loads from Supabase and logs what was retrieved

No layout or CSS was changed. Only data save/load/mapping logic.

---

## Success Criteria

✓ Console shows "RETURNING INVOICE_ITEMS (NOT FALLBACK)"
✓ Invoice table shows itemized rows (Garments, Setup fee, Film fee, etc.)
✓ Sum of rows = total estimate
✓ No layout or styling changed
