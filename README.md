# Nong’s Art Den

Artist website and studio administration for Nong in Aiken, SC.

The Next.js application is in [`website`](website). See the [setup guide](website/README.md) for local development, admin access, and Vercel deployment.

## Deploy on Vercel

Import this GitHub repository and set **Root Directory** to `website`, framework to **Next.js**, and build command to `npm run build`.

Configure these server-only environment variables before opening registration:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Public Vercel Blob store for published artwork |
| `REFERENCE_BLOB_READ_WRITE_TOKEN` | Separate private Vercel Blob store for customer reference photos |
| `ADMIN_USERNAME` | Studio admin username |
| `ADMIN_PASSWORD` | Long, unique admin password |
| `SESSION_SECRET` | Random secret of at least 32 characters |

Copy variable names from [`website/.env.example`](website/.env.example). Never commit credentials. Leave `LOCAL_ADMIN_PREVIEW` unset on Vercel; production always requires authentication.

After connecting services, redeploy and sign in at `/admin/login`. Review sample programs, dates, pricing, and content before enabling registration in Studio settings. Local preview records do not automatically migrate to Neon.

Original source images, local customer records, uploads, and environment secrets are excluded from this repository. Optimized sample artwork used by the site is included in `website/public/art`.

Payments, email, SMS, and reminders are not yet integrated.
