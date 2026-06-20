# CLAUDE.md — Group Ordering App

Context for Claude Code. Read this before editing.

## What this project is

A **group-ordering web app** for custom printing / embroidery orders ("My Shirt Printing"). Group leaders create orders, members open a shared link and submit their shirts (sizes, colors, names/numbers, decoration), and admins/leaders review submissions.

## Architecture (important — not a typical project)

- **One single self-contained file: `group-order.html`.** All HTML, CSS, and JavaScript are inline in that one file. There is **no `src/` folder, no React/Vue, no build step, no npm, no bundler.**
- The JS is **global-scope, non-module**, wired through inline `onclick=` handlers. Do **not** convert it to ES modules — that would break every handler.
- It runs by opening the file directly (`file://`) or via any static host.
- Data layer is **hybrid**: Supabase when configured, otherwise `localStorage` fallback so the app always runs.

## Hard constraints (do not violate)

- **Edit in place. Do not rewrite the project** or restructure into multiple files/folders.
- **Do not break the login/landing page** (the `.lp-*` hero/benefits/steps section in `#page-login`) or any existing routing, auth, forms, or links.
- **Keep it beginner-friendly.** Plain, readable JS. **No new libraries** unless truly required.
- **Match the existing visual system** — CSS variables (`--navy #1B2A4A`, `--bg #E8EDF5`, `--yellow #F5C842`), and the existing `.btn`, `.card`, `.notice`, `.eyebrow` components. No new color palette.
- **Anon key only** in the frontend. **Never** put the Supabase `service_role` key in any file here. Never enforce security in the frontend — that's RLS's job.

## Files

- `group-order.html` — the entire app.
- `supabase-config.js` — holds `window.SUPABASE_CONFIG = { url, anonKey }`. **Git-ignored**, created from the template. If missing/placeholder, app runs in localStorage mode.
- `supabase-seed.sql` — one-time insert of a test order (`demo-supabase-1`) so the member flow has something real to load. Does not change schema.

## Supabase wiring (already done)

Loaded via CDN UMD build (`@supabase/supabase-js@2`) → `window.supabase`. A `SUPABASE LAYER` section in the script holds the integration:

- `SB` / `sbReady()` — the client (or null) and a readiness check.
- `dbOrderToApp(row)` / `dbResponseToApp(row)` — map snake_case DB rows to the app's camelCase shapes.
- `isOrderExpired(order)` — date-only deadline check.
- `fetchOrderById(id)` → `{ok, order}` | `{ok:false, reason:'notfound'|'error'}`.
- `insertResponseRow(payload)` → `{ok}` | `{ok:false, error}`.
- `fetchResponsesByOrder(orderId)` → `{ok, responses}`.

Each helper uses Supabase when configured and **falls back to localStorage** otherwise.

Three flows are connected (matching the current RLS policies):

| Flow | Function | RLS used |
|---|---|---|
| Member loads an order by id | `loadOrderForm(id)` (async) | `public read orders` |
| Member submits a response | `submitOrder()` (async) | `public insert responses` |
| Admin/leader views responses | `viewSubmissions(id)` (async) + `exportCSV(id)` (async) | `public read responses` |

Supporting details:
- `currentOrderData` caches the loaded order; `currentOrder()` returns it (so Supabase-only orders work in the panel without a localStorage copy).
- `orderSubmitting` flag + disabled button = double-submit prevention. Errors show in `#submit-error`; success shows the existing success screen.
- Loading / not-found / closed / expired states render in `#order-unavailable-notice` and `#order-closed-notice`.
- The per-response **Remove** button is hidden when `sbReady()` because there is **no delete policy** on `responses`.

## Database schema (already created in Supabase — do not change without reason)

`orders(id text pk, name, deadline date, purge_date date, leader_code text, description text, status text default 'open', shirt_options jsonb default '[]', created_at timestamptz)`

`responses(id text pk, order_id text references orders(id) on delete cascade, name, items jsonb default '[]', notes text, order_total numeric default 0, created_at timestamptz)`

RLS enabled. Policies: `public read orders`, `public insert responses`, `public read responses`. **Note: no insert/update policy on `orders`**, so the frontend cannot create orders in Supabase. Order *creation* still writes to localStorage only.

Response `items` JSON shape: `{ shirtLabel, color, deco, size, cat, qty, notes, unitPrice }` (the app also includes `shirtOptionId`).

## How to run / test

1. Put real values in `supabase-config.js`, and add it to `.gitignore`.
2. Run `supabase-seed.sql` in the Supabase SQL editor.
3. Open `group-order.html?order=demo-supabase-1` → should load the order.
4. Submit the form once → check Supabase `responses` table for the new row (verify `order_total` + `items`).
5. Admin login → open that order → Submissions → confirm the response appears.
6. Open `?order=does-not-exist` → friendly "Order not found" message.

## Open items / TODO (start here)

1. **Verify the expired-state logic.** The local demo order `demo-1` has a past deadline (`2025-06-30`), so `loadOrderForm` should show the "deadline has passed" notice and hide the form. Confirm this renders correctly (not a blank/broken form). Read `loadOrderForm` + `isOrderExpired`.
2. **Live Supabase round-trip.** Once real credentials are in, test load → submit → read end to end (needs the user to add keys + run the seed).
3. **Tighten RLS before production.** Current policies are wide open: anyone can insert any response (spam/forgery) and read every submitter's name. Suggest safer policies (e.g. validate `order_id` exists and the order is open; gate response reads behind the leader, likely via auth or an edge function). Discuss before implementing — may need schema/auth changes.
4. **Order creation → Supabase (optional).** To make leader-created orders loadable by members, either insert orders via SQL/dashboard, or add an insert/update policy on `orders` and wire `saveNewOrder` to Supabase. Currently out of scope by design.
5. **Known limitation:** dashboard aggregate stats still count *local* responses, not Supabase. Making those live would be a broader change — only do it if asked.

## Style of help wanted

Surgical, in-place edits. Explain what changed, which functions, and what to test. Keep the diff small and the code approachable.
