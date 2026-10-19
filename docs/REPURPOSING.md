# Repurposing the application

## Branding and interface

- Update names and wording in `app/cash-manager.tsx`, `app/login/page.tsx`, `app/account/page.tsx`, `app/layout.tsx` and `lib/server.ts`.
- Replace files in `public/brand/` with your own assets and update references where filenames differ.
- Change shared colours, typography and responsive layouts in `app/globals.css`.
- Change package identity in `package.json`, then run `npm install` to update the lockfile.
- Review `lib/cashbook.ts` for currency formatting, categories, calculations and role labels. The default currency is INR and date reporting uses India time.

## Architecture

The UI uses React and TypeScript, with Vinext/Vite and reusable components. API routes execute in a Cloudflare-compatible Worker runtime. D1 provides the relational database and, by default in production, receipt storage. Optional R2 stores new receipts when a BUCKET binding is configured. Local development emulates these services.

The main money rules live in `lib/cashbook.ts` and the API routes. They use integer paise. A company allocation is part of the source client receipt, so it does not create extra cash. Submitted expenses affect recorded balances immediately; approval status is independent of cash posting.

`lib/server.ts` contains workspace and role enforcement. `COMPANY_OWNER` identifies a company workspace, not the administrator. User identities are separate database records. This version supports one company and one administrator; a multi-company deployment requires explicit tenant-scoping changes throughout the queries.

Preserve the included reusable UI components and their dependencies when extending the app. Framework, Worker runtime and storage packages provide application functionality even when they are not imported directly by a page.

## Accounts

`auth_users` holds account identities and salted password hashes. `auth_sessions` stores hashes of random session tokens with an eight-hour absolute expiry. Cookies are HttpOnly and SameSite=Strict, and use Secure when the request is HTTPS. Authentication does not trust caller-provided identity headers.

Passwords use Web Crypto PBKDF2-SHA256 with a random 16-byte salt, a 32-byte result and 100,000 iterations, compatible with the bundled runtime. Login and password-change attempts are throttled in the database. For a different runtime, review its supported password KDF and configure a suitable work factor.

The administrator is provisioned by `npm run admin:create` for local storage, or `npm run admin:create -- --remote` for the explicitly configured production database. Staff accounts are created through the administrator's **Team & portals** screen and linked to their membership by immutable user ID. Every request rechecks current role and membership. There is no email delivery or self-registration dependency.

Use `/account` for a user's password change. Administrators can set a replacement password in the teammate edit form. These operations revoke existing sessions.

## Local configuration and deployment

`config/runtime.json` describes local bindings. Its placeholder database ID identifies emulator storage; local use does not need a Cloudflare account or real remote resource identifiers.

For a hosted installation, follow `DEPLOYMENT.md`. Copy `config/production.example.json` to `config/production.json` and supply your own Worker name, D1 database ID and optionally an R2 bucket. Keep the `DB` binding; use `BUCKET` only when enabling R2. Production configuration is separate from ordinary local development and is ignored by Git.

`npm run build` prepares the local profile; `npm run build:production` prepares the configured production profile. Both write to `dist/`. `npm run deploy:check` builds production and performs a dry run; `npm run deploy` builds and publishes it. Neither deployment command provisions resources or applies migrations automatically.

Serve the application over HTTPS. Keep the public request origin consistent through any proxy, because mutations require an exact Origin match. Preserve native authentication and backend access checks. Establish backup and restore procedures for both the database and receipt objects before using business data.

To use a conventional Node server, PostgreSQL or another storage provider, replace the storage/runtime adapters and migration process. Replacing a configuration label alone does not convert the Worker application into another runtime.

## Source and dependencies

All supplied application files are editable. Third-party packages and vendored components retain their respective licenses. Keep the included license files when retaining those components. The supplied logo and font belong to the existing brand; use your own assets when repurposing for another organisation.
