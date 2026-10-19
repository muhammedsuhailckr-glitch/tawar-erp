# Tawar Homes1

The redesigned live app is at https://01.tawarhomes.workers.dev. Its database contains a one-time copy of the original app; the two installations are independent. Existing users can sign in with their current credentials. The reusable source archive contains no live records.

Start with [START-HERE.md](START-HERE.md) for local use, your hosting account setup and client installation guidance.

A standalone construction accounts application with company and project cashbooks, negative balances, configurable first-payment allocations, project collections, expense approvals, salary records, employees, attendance and leave.

The application includes its own email/password accounts and session management. Local use needs no hosted account, API key or external authentication service. All application routes, components, migrations, branding assets, tests and setup scripts are supplied.

## Open in VS Code

1. Extract the ZIP to a folder on your computer.
2. In VS Code, choose **File → Open Folder** and select the extracted `01` folder containing `package.json`.
3. Choose **Terminal → New Terminal** and follow the commands below.

## Requirements

- Node.js **24 or newer**, with npm.
- Windows, macOS or Linux; internet access for the first dependency installation.

## First local setup

```sh
npm install
npm run local:setup
npm run admin:create
npm run dev
```

`admin:create` asks for your name, email and a password of 12–128 characters. Password input is hidden. There are no preset credentials and no public registration endpoint.

Open **http://127.0.0.1:5173**, choose **Sign in**, and enter the credentials you created.

The database starts empty. You can explore the read-only sample workspace, or sign in to enter your own projects and transactions. Existing online or previous installation data is not included.

For subsequent starts, run `npm run dev`. This command also applies any outstanding local database migrations automatically; your saved records persist. Stop the app with Ctrl+C. If the port is occupied, use `npm run dev -- --port 5174` and open http://127.0.0.1:5174.

`npm install` followed by `npm run dev` is sufficient to launch the application and its sample workspace. Complete administrator creation before saving real records. For reproducible dependency installation from the supplied lockfile, use `npm ci`.

## Bills, approvals, photos and appearance

Administrators and assigned project managers can approve an active project expense directly, including before an engineer check. Their approval is final; no remaining lower-level review is required. Engineers can still check submitted entries. Review permissions remain limited to assigned projects. Approval does not deduct cash again.

**Bills → New bill** lets administrators and project managers issue standalone Tawar Homes bills. They do not change projects, expenses or account balances. Administrators can see all bills; project managers see bills they issue. These are simple bills/payment receipts, without GST tax calculations.

When recording cash received, select **Generate a Tawar Homes payment receipt after saving**. For an existing received-payment entry, select **Generate bill**. The receipt uses the saved payment amount and creates no second cash entry. Open a document and select **Print / Save PDF**. To correct an issued bill, cancel it with a reason and issue a replacement. Receipts are flagged if their linked payment is later changed or deleted.

Uploaded profile photos now appear beside people in **Team & portals**. People manage their photos through **Settings**.

**Settings → Appearance** offers **Use device setting**, **Light** and **Dark**. The desktop sidebar stays visible. On phones, use the top-left button to open the sidebar and its close button to hide it. Forms and bill previews adapt to phone widths.

## Set up your company

1. Create each project with its total contract value and advance-profit percentage.
2. The first recorded client payment allocates that percentage to the company account. Subsequent receipts remain in the project. Pending client payments use the full client receipts, before allocation.
3. Record paid expenses even when no funds have been added. Project and company balances can go below zero.
4. Keep permanent salaries and overheads in the company account; site costs belong to projects.
5. Add employees in **People & HR**. Record attendance, leave and salary payments. These are payment records, not bank transfers.
6. Add teammates in **Team & portals** with an email, initial password, role and assigned projects. Share credentials privately. Users can select **Change password** after signing in.

Expense approval: supervisors enter and engineers can check. Administrators and assigned project managers can give final approval at any review stage; remaining checks are then unnecessary. Cash is deducted when recorded, not again at approval. Returned expenses can be corrected and resubmitted. Engineers cannot check their own entries.

Company financial records and HR administration are restricted to the administrator. Other users receive their assigned project access and their own linked employee records. Disabling a user ends their sessions immediately. Updating a teammate's password also ends existing sessions.

## Administrator recovery

To intentionally replace the administrator credentials on this local installation:

```sh
npm run admin:create -- --reset
```

This requires terminal access to the local application files and database. It does not erase projects or expenses. Ordinary `admin:create` refuses to overwrite an existing administrator.

## Tests and build

```sh
npm run test:accounting
npm run typecheck
npm run build
```

The tests run on isolated in-memory storage. They do not modify your local app database. Completed verification and its scope are recorded in `docs/VERIFICATION.md`.

After building, stop the development server and run the compiled application locally:

```sh
npm start
```

It uses the same local database and receipt storage at http://127.0.0.1:5173, including the same email/password login. If the most recent build used the production profile, run `npm run build` again before `npm start`.

## Data and backups

Cloudflare D1 (SQLite) is emulated locally by Wrangler/Miniflare; R2 support is optional. Application data and receipt files are stored in `.wrangler/state/`. Keep this folder to preserve records. Stop the app before copying that entire folder as a backup.

`npm run local:setup` tracks applied migrations and can be rerun safely. Do not edit or replay migrations already applied to a database. To begin an unrelated repurposed installation, use a fresh extracted project with a fresh database; do not mix data folders from different application variants.

`node_modules`, `dist`, `.runtime` and generated caches can be recreated. `.wrangler/state` holds your records and should be backed up.

## Deploy independently

The backend uses Cloudflare Workers and D1, with optional R2 receipt storage. The default production profile stores receipts in D1 and needs no R2 activation or payment method. A Cloudflare account and your own database are required only when deploying remotely. Follow `docs/DEPLOYMENT.md` to configure those resources, apply migrations, create an administrator and deploy under your own account.

`npm run deploy:check` builds the configured production application and performs a deployment dry run. `npm run deploy` actually publishes it. Private deployment identifiers and administrator credentials are excluded from this reusable source package.

A conventional Node server, VPS or another database provider requires changes to the runtime/storage adapters. See `docs/REPURPOSING.md` for the architecture and extension points.

## Folder map

- `app/`: dashboard, five role portals, login, password changes and API routes.
- `lib/`: money calculations, role checks, passwords, sessions and common helpers.
- `db/`: database schema and adapter.
- `drizzle/`: SQL migrations, snapshots and migration journal.
- `components/ui/`: included UI components.
- `public/brand/`: supplied logo variants and Bingo font.
- `config/runtime.json`: local runtime, database and receipt-storage bindings.
- `config/production.example.json`: template for your own remote deployment.
- `scripts/`: local launchers, migrations, administrator setup and deployment commands.
- `tests/`: accounting, permissions and authentication tests.
- `vendor/`: included third-party styles and license notices.
- `package-lock.json`: npm dependency lockfile.
- `FOLDER_STRUCTURE.txt`: full listing of supplied files.
- `SOURCE_MANIFEST.json`: per-file checksums.
- `docs/`: deployment, repurposing and verification details.

Third-party packages and vendored components retain their respective licenses. Keep the supplied license notices when retaining that code.

## Troubleshooting

- **Dependency errors:** confirm Node 24+ with `node --version`; use the supplied npm lockfile and `npm ci` for a clean installation.
- **Database/table errors:** stop the server, run `npm run local:setup`, then restart.
- **Cannot sign in:** create the administrator first, verify the email/password, or check that the teammate is enabled. Login attempts are limited; wait 15 minutes if temporarily blocked.
- **Windows native runtime errors:** use an up-to-date supported Windows version or WSL2. The native runtime has its own operating-system requirements.
- **Local device access:** the supplied launchers listen on `127.0.0.1` for use on this computer. Use the deployment guide for a shared hosted installation.
