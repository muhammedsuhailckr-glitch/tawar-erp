# Project 01: shorter address verification — 20 September 2026

Live app: https://01.tawarhomes.workers.dev

Published Worker version: `5c7e6332-e543-4ba7-a1c3-2fa36f16978c`.

- Package, local runtime and production Worker names are `01`. The VS Code workspace `01.code-workspace` was opened and the displayed project name verified.
- Production build passed. Compiled deployment configuration and deployment output confirm the original D1 database is still bound to this design.
- 18 public/API/asset checks passed at the new address. Five deployed CSS/JavaScript assets matched the production build. Anonymous access to private cashbook, profile, people and billing APIs remains blocked.
- The sign-in page loaded successfully in the browser at the new HTTPS address. A fresh sign-in is needed because the browser origin has changed; existing credentials remain in the same database.
- No application code, database migration, record update or credential change was needed. The previous Worker `tawar-homes1` remains available for old links; future deployments from this project target `01`.
- Source archive checksums and ZIP integrity were verified. Private production configuration, credentials, database data, dependencies and generated output are excluded.

---

## Historical verification before the address change

# tawar-homes1 profile-settings verification — 20 September 2026

Live app: https://tawar-homes1.tawarhomes.workers.dev

Published Worker version: `92ef82d8-b8d7-4645-a509-69962be8c326`.

## Current update

- Type checking, targeted lint for AccountSettings/ProfileEditor, and production build passed.
- Browser checks used isolated local accounts. Settings initially showed saved profile values without an open editor. Edit profile opened the form. Cancel preserved the previous values. Saving a changed name and city returned to the summary and updated the sidebar name. Existing photo display was retained in the redesigned staff portal. Saved values persisted after reload in the original design.
- The profile summary was visually checked in desktop dark mode and at a 390 × 844 phone viewport. No browser errors were captured in the redesigned local check.
- Signed-in, read-only verification on both live apps confirmed the saved profile view, Edit profile button, no initial profile inputs, one Change password link in Settings and no Change password link on Overview.
- 18 live public/API/asset checks passed for this app. Five deployed CSS/JavaScript assets matched the tested production build. Anonymous access to cashbook, profile, people and bills remains blocked.
- No database migration, live record edits, account creation or password changes were needed. Both existing databases and designs remain in place.

This was a UI-only update. The earlier 500-assertion backend suite below was not rerun; the current checks focus on the changed profile workflow. Source archives exclude private configuration, credentials, records, dependencies and generated builds.

---

## Historical verification from the preceding billing update

# tawar-homes1 verification — 20 September 2026

Live app: https://tawar-homes1.tawarhomes.workers.dev

Published Worker version: `654b8e8b-98a8-404f-b588-3da9cc28af74`.

## New feature verification

- Type checking and production build passed.
- All 500 automated assertions passed: billing and approvals (97), accounting and permissions (142), authentication (52), CSV (10), receipt storage (36), entry controls (80), and profiles/analysis (83).
- 58 HTTP checks passed on this compiled app with isolated local test data: the 37 existing account/profile/HR checks and 21 checks covering final manager approval, standalone bills, source-linked receipts, account-balance preservation, bill permissions and uploaded photos.
- The two existing visual designs were retained. Desktop light/dark mode and 390 × 844 phone layouts were checked. The classic bill form and redesigned receipt preview fit within the phone viewport without horizontal document overflow. Mobile sidebars open and close; desktop sidebars remain expanded. No browser errors were captured.
- Bills use Tawar Homes branding, the existing company email and TH document numbers. Receipt generation copies the saved payment and does not create a second transaction. Bill printing keeps a white document in dark mode.
- 18 live public/API/asset checks passed. Five deployed CSS/JavaScript assets matched the tested build. Anonymous access to cashbook, profile, people and bills remains blocked. The new Bills section also loaded successfully using the existing signed-in browser session.

## Existing data preserved

A private D1 backup was taken before applying `0006_standalone_bills.sql`. Before/after comparisons found identical rows in all 12 existing business, user, profile, receipt and audit tables. The migration adds an empty bills table and its indexes. Active sessions and login-throttling metadata were excluded from the business-table comparison; no credentials were reset.

No live test financial entries, bills or accounts were created. All write-based regression tests used disposable local data. The two apps retain their existing separate databases; this update did not repeat the earlier record copy or add ongoing synchronisation. No R2 subscription or payment method was added.

## Scope

These are functional checks rather than a full security, accessibility or load audit. Existing whole-project lint debt remains; lint was not rerun as a release gate. Bills are simple bills/payment receipts without GST calculations. The source archive excludes database backups, credentials, private production configuration, dependencies, build output and local test data.
