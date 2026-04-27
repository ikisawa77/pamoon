# Deployment Notes: NokHosting Node.js Hosting

Target host: https://www.nokhosting.com/category/node-js-hosting

## Hosting Fit

NokHosting's Node.js Hosting page states that the plans include Node.js auto install, SSH Terminal, npm package installation support, MariaDB databases, free SSL certificate, and daily backups.

Next.js 15 requires Node.js 18.18.0 or newer. Before deployment, configure the hosting Node.js version to at least `18.18.0`; Node 20 LTS is preferred if available.

## Build Configuration

`next.config.ts` uses:

```ts
output: "standalone"
```

This is suitable for self-hosted Node.js deployments because Next.js emits a standalone server bundle under `.next/standalone` after build.

## Recommended Deploy Steps

```bash
npm ci
npm run build
npm start
```

If the hosting panel expects a Node.js startup file, point it to the standalone server after build:

```bash
node .next/standalone/server.js
```

You may need to copy `public/` and `.next/static/` beside `.next/standalone/` depending on the host's deployment workflow.

## Production Environment Variables

Use the hosting panel environment variable UI or `.env` file:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=
AUTH_SECRET=
PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=
```

## Database Note

The host advertises MariaDB support. For the real version, either:

- use MariaDB with Prisma/Drizzle for users, shops, listings, bids, wallet ledger, and orders, or
- use an external Postgres provider if ledger/audit requirements become more demanding.

