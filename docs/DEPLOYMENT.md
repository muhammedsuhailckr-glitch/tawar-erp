# Deploy under your own Cloudflare account

Current Worker name: `01`. Live app: https://01.tawarhomes.workers.dev. The existing D1 database is retained. Use `npm run deploy` from this project for future updates. The previous `tawar-homes1` Worker remains available for existing links.

The application runs on Cloudflare Workers with a D1 database. Receipts are stored in D1 by default; an R2 bucket is optional. The default setup does not require activating R2 or adding a payment method. Local development emulates these services without a Cloudflare account. Remote deployment requires your own account and resources.

The existing tawar-homes1 installation is already configured and its accounts and records have been copied. For routine updates, use `npm run deploy` from the working project. Do not recreate its database or administrator.

The following commands reproduce the deployment from a fresh `01` source folder. They create a separate installation; private production configuration and credentials are excluded from the source package.

## 1. Install and authenticate

Use Node.js 24 or newer:

```sh
npm install
npm run wrangler -- login
```

Complete the account sign-in in your browser. For automated deployment, Wrangler also supports Cloudflare API credentials provided by your CI environment. Keep credentials out of source control.

## 2. Create your database

```sh
npm run wrangler -- d1 create tawar-homes1-accounts
```

You can choose a different resource name. Record the returned `database_id`. Skip R2 activation for the free setup. Receipts up to 5 MB are stored as database chunks, with about one-third encoding overhead. Records and receipts share the database storage allowance. For current D1 storage and daily read/write limits, see https://developers.cloudflare.com/d1/platform/limits/ and https://developers.cloudflare.com/d1/platform/pricing/. Monitor usage before onboarding clients.

## 3. Set production configuration

In VS Code, copy `config/production.example.json` and name the copy `config/production.json`.

Edit the copy with:

- `name`: the Worker name you want to deploy, such as `01`.
- The D1 entry's `database_name` and `database_id`: the database you just created.
- Optionally, `account_id`: your Cloudflare account identifier when you have several accounts.

Keep the logical binding name `DB`, the entry point, migration path and compatibility settings. The production commands reject an unconfigured placeholder database ID.

`config/production.json` is ignored by Git. It contains deployment identifiers; do not add API tokens or passwords to it. Ordinary `npm run dev` continues to use the local profile in `config/runtime.json`.

## 4. Apply migrations and create your administrator

These commands modify your configured remote database:

```sh
npm run db:migrate:remote
npm run admin:create -- --remote
```

Administrator creation asks for a name, email and password. There are no preset credentials. Subsequent teammates can be created in the application's **Team & portals** screen.

Migrations track what has already been applied. Keep existing migration files intact and add new migrations for later schema changes. Local records and uploaded receipts are not copied to production by these commands.

If you intentionally need to replace the remote administrator credentials later:

```sh
npm run admin:create -- --remote --reset
```

Resetting credentials ends existing administrator sessions; it does not erase projects or expenses.

## 5. Check, then deploy

Run application checks and validate production packaging:

```sh
npm run test:accounting
npm run typecheck
npm run deploy:check
```

`deploy:check` builds with `config/production.json` and asks Wrangler to perform a deployment dry run. It does not publish the app. A dry run validates packaging; it does not prove that your account has every required permission or that remote resources are available.

To build and publish the configured application:

```sh
npm run deploy
```

The command deploys the generated `dist/server/wrangler.json` configuration, including its compiled Worker and client assets. Open the HTTPS URL shown by Wrangler and sign in with the administrator credentials you created.

`npm run build:production` is also available if you only want to create a production build. Deployment does not automatically apply database migrations; run `npm run db:migrate:remote` before deploying an update that introduces new migrations.

## Local and remote data

Local records and receipt objects live in `.wrangler/state/`. Production uses your own D1 database. With the default profile, exporting D1 includes receipt chunks as well as records. Protect exports as private financial and account data, and test restoration to a separate database. Copying the local folder is not a production backup.

An on-demand production export can be made with `npm run wrangler -- d1 export DB --remote --config config/production.json --output /path/to/private-backup.sql`. Choose a private destination outside the shared source tree. Cloudflare also offers a limited Time Travel recovery window; it does not replace your own backup process.

`npm run build` and `npm run build:production` both write to `dist/`. To run the compiled app locally after a production build, first run `npm run build`, then `npm start`.

Serve production over HTTPS. If adding a reverse proxy or custom domain, preserve the request's public origin so sign-in and other mutations pass the application's same-origin checks. There is no required external authentication callback URL.

## Optional R2 upgrade

If you later choose to activate R2 and accept its billing terms, create a bucket and add `"r2_buckets": [{"binding":"BUCKET","bucket_name":"your-bucket"}]` to the production configuration. New receipts then use R2; existing database receipts remain readable. Back up both stores after this change. Do not remove the local R2 binding if you already have local receipts stored there.

## Other hosting providers

The project is independently editable and deployable, and the included deployment commands target the backend runtime it already uses. Conventional Node/VPS hosting or a different database provider requires adapting the Worker entry point, D1/R2 storage access and migration process. See `REPURPOSING.md` for those boundaries.
