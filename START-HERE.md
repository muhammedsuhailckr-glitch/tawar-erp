# Tawar Homes — project 01 — start here

Live app: https://01.tawarhomes.workers.dev

The new project is in `/Users/tawarventures/Downloads/tawar-homes1`. Open `tawar-homes1.code-workspace` in VS Code. The interface combines the supplied preview and design files with the current app's accounting, entry controls, profile settings and analysis features.

## View and edit your saved profile

Open your name or photo at the bottom left and choose **Settings**. Your saved photo and basic details appear first. Select **Edit profile** only when you want to change them. **Save profile** returns to the details view and updates your name and photo in the account area. **Cancel** leaves your saved details unchanged.

**Change password** remains under **Settings → Account security**. The repeated page-footer link has been removed.

## Bills, approvals, photos and appearance

Administrators and assigned project managers can approve an active project expense directly, including before an engineer check. Their approval is final; no remaining lower-level review is required. Engineers can still check submitted entries. Review permissions remain limited to assigned projects. Approval does not deduct cash again.

**Bills → New bill** lets administrators and project managers issue standalone Tawar Homes bills. They do not change projects, expenses or account balances. Administrators can see all bills; project managers see bills they issue. These are simple bills/payment receipts, without GST tax calculations.

When recording cash received, select **Generate a Tawar Homes payment receipt after saving**. For an existing received-payment entry, select **Generate bill**. The receipt uses the saved payment amount and creates no second cash entry. Open a document and select **Print / Save PDF**. To correct an issued bill, cancel it with a reason and issue a replacement. Receipts are flagged if their linked payment is later changed or deleted.

Uploaded profile photos now appear beside people in **Team & portals**. People manage their photos through **Settings**.

**Settings → Appearance** offers **Use device setting**, **Light** and **Dark**. The desktop sidebar stays visible. On phones, use the top-left button to open the sidebar and its close button to hide it. Forms and bill previews adapt to phone widths.

## Sign in and continue

Use the same email and current password that you use in the original Tawar Homes app. Existing accounts, projects, transactions, assignments and saved profiles were copied once on 20 September 2026. Active login sessions were not copied, so sign in again on the new address.

The two live apps now use separate databases. Changes, passwords, entries and profile updates made in one app do not synchronise to the other. The original app remains at https://tawar-homes.tawarhomes.workers.dev.

Open **Sign in** for your copied records. **Explore sample workspace** displays example data only. No R2 subscription or payment method was added; receipts and profile photos use the new app's D1 database.

## Run locally

For a fresh installation, use Node.js 24 or newer:

```sh
npm ci
npm run local:setup
npm run admin:create
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174. The local database starts empty and is separate from both live apps. Subsequent local starts only need the final command. Local administrator creation does not change the live administrator.

## Edit or delete financial entries

Use the **Edit** or **Delete** buttons beside an entry in Cashbook, Reviews or Company account; on Overview, click a recent entry to open its details. These controls also appear in Entry details. Administrators can edit salary components under People & HR → Salary.

Creators can manage their own project entries; the administrator can manage all financial entries. Editing a project expense sends it through review again. Deleting asks for a reason and removes the amount from balances, while preserving the audit record and receipt. Select **Deleted** in the Cashbook status filter to find those records. Refresh the page after a deployment to load new controls.

## Personal dashboards and analysis

Every portal opens on **Overview**, the first sidebar item. **Analysis** and **My dashboard** are lower in the sidebar. My dashboard contains personal summaries without profile-editing controls.

Click your name or photo at the bottom left to open the account menu, then choose **Settings** or **Logout**. In Settings, saved details are shown first. Select **Edit profile** to add or replace a photo or change your name, phone, city, job title and short bio; **Save profile** applies changes and **Cancel** discards unsaved changes. A saved photo or name updates the bottom-left account area immediately. Photos are resized to 512 pixels and saved privately in the existing database. Only that person and the administrator can access their profile photo. Editing a profile cannot change a sign-in email, role or project access.

Settings also includes **Preferences** for the default My dashboard date range (This month or All time) and table spacing (Comfortable or Compact). Preferences are saved separately for each account in the current browser. A Change password link is available in Settings.

The dashboard shows that person's expenses and current review status, assigned projects, linked salary payments, attendance and leave summary. To connect HR data, open **People & HR**, edit the employee and select their portal account. An employee without a portal account needs one created under **Team & portals** before they can sign in and manage a profile.

Administrators have **Analysis** in the sidebar:

- **People analysis:** search and select an account or employee to see their profile, entries, checks, approvals, projects, attendance, leave and salary. Salary and attendance need a linked employee record.
- **Project analysis:** compare all projects or choose one for receipts, spending, internal allocations, cash balance, pending client payments, expense categories and team assignments.
- **Total analysis:** company-wide receipts, spending, net cash movement, company/project cash, contract values, pending client payments, categories and monthly movements.

Use the From/To dates or **All time**. Period figures use the selected entry dates; balances and client dues include all active entries through the To date. Allocations are internal transfers and do not create extra income. Deleted entries are excluded. Missing attendance dates are not counted as absences, and the reports do not infer employee performance or project profitability.

Refresh the live app after deployment to load the new navigation. Profile photos share the free database's storage allowance; each uploaded photo is limited to 512 KB after resizing. Migration 0005 adds profile storage without replacing existing accounting records.

## Update this live app

The working project on this computer already has its separate production configuration. From the `tawar-homes1` folder, run:

```sh
npm run test:accounting
npm run typecheck
npm run deploy
```

Apply `npm run db:migrate:remote` first only when an update adds a database migration. Do not rerun the data copy or reset the administrator for routine updates. This source ZIP excludes the private production configuration; see `docs/DEPLOYMENT.md` when setting up a different computer or client installation.

## Source and data backups

The source archive contains application code, assets, migrations, tests and instructions. It excludes account credentials, production database exports, private deployment configuration, dependencies and generated build files. It is a source backup, not a backup of your live records.

Export the new app's D1 database separately to a private location; the export includes its stored receipts and profiles. Keep the original and new app's backups clearly named. Local records live in `.wrangler/state/`; stop the local app before copying that folder.

## Client installations

This version supports one company per installation. Each client needs a separate deployment, database and administrator; use an empty database for a client. The one-time record copy was specifically for your own second app. See `docs/VERIFICATION.md` for completed checks and the remaining code-quality and release work.
