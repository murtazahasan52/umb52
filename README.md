# Upliftment Register

Community Upliftment & Impact Monitoring System for Dawoodi Bohra Mauzes in villages and small towns, covering Tijaarat Raabehah, Qardan Hasana, skill & employment and family welfare support.

One project gives you:

| Part | URL | Who uses it |
|---|---|---|
| Public website | `/` | Families and the community: how it works, request support, raise / track a concern |
| Admin panel | `/admin` | HQ, Zonal Business Council (ZBC), Mauze committee, counsellors / mentors |
| Family app (installable PWA) | `/app` | Beneficiary families on their phones |
| REST API | `/api/*` | Used by all of the above |

Stack: React 18 + Vite (frontend), Node.js + Express (backend), MongoDB (database). Deploys on Vercel as two services in one project (`vercel.json`). On a normal server, the backend also serves the built frontend.

---

## What the system does (mapped to the framework)

| Framework checkpoint | Where in the system |
|---|---|
| 1. Identify every family and assess needs | **Household survey**: members, income, business, debts, housing / education / health needs, skills, existing QH / TR, level of need, confidential notes |
| 2. Individual upliftment plan | **Case → Plan**: documented need, agreed interventions, target outcome (6–12 months), counsellor, mentor, review date, baseline |
| 3. Match to the right scheme | Scheme selection (QH / TR / Skill / Welfare), matching notes, "terms explained" record |
| 4. Feasibility before sanction | **Case → Feasibility**: purpose, working capital vs fixed asset, demand, margin, projections, liabilities, repayment capacity, security, documents, tenure, phased disbursement. Decision (approve / modify / reject + reason) is **ZBC / HQ only** |
| 5. Verify actual use of funds | **Case → Utilization**: items, invoices, uploaded evidence, site visit, verify or flag diversion, resulting asset |
| 6. Monitor business & family outcomes | **Case → Monthly progress**: sales, margin, profit, stock, receivables, debts, jobs, customers, household income, education, chart vs baseline. Families can submit from the app |
| 7. Build capability | **Case → Capability**: training / mentoring by area (accounts, pricing, stock, GST / Udyam, digital payments, marketing, online sales, vocational), completed / applied |
| 8. Review impact & close gaps | 6- and 12-month outcomes, success stories, repeat-application classification (growth vs distress), final status, activity log |

Plus:

- **Four separate measurements**: sanctioned, disbursed, verified as properly used and outcome achieved are never added together, on every case and on the dashboard.
- **Early-warning engine** (high / medium / on track), recalculated on every change and daily. High: funds used for an unapproved purpose, business closed, 2+ installments overdue for 60+ days, open high alert. Medium: no utilization 30 days after disbursement, under 80% verified after 60 days, installments overdue, sales falling 3 months running, stock not moving, receivables rising sharply, review date passed, no monthly update for 45 days, training not applied or attended. Committee alerts carry a written recovery plan, a responsible mentor and a review date.
- **Mauze scorecard** with all 8 indicators (coverage, plan coverage, utilization verification, business follow-up, repayment, livelihood improvement, capability building, grievance resolution). Each shows actual numbers **and** a percentage against target.
- **QH vs TR measured differently**: separate scheme columns, including "repaying but income not improved".
- **Repayment schedule** generation and payment recording, with overdue tracking.
- **Grievances** with ticket number, public tracking and a 15-day service standard. **Support requests** from the website.
- **Role-based access**: HQ sees everything, ZBC its zone, Mauze / counsellors their Mauze, families only their own plan (no internal risk notes).
- **Confidentiality**: evidence files only open for logged-in staff, an access log of who viewed or changed records (HQ → Reports), and CSV exports.

### Roles

| Action | HQ | ZBC | Mauze | Counsellor | Family |
|---|---|---|---|---|---|
| Household survey, open case, plan, utilization, monthly updates, visits, training, alerts | ✓ | ✓ (zone) | ✓ (Mauze) | ✓ (Mauze) | — |
| Feasibility decision / sanction, disbursement, repayment schedule | ✓ | ✓ | — | — | — |
| Record installment payment | ✓ | ✓ | ✓ | ✓ | — |
| Add users | all roles | ZBC, Mauze, counsellor, family | counsellor, family | — | — |
| Zones | ✓ | — | — | — | — |
| Mauzes | ✓ | add / edit in zone | edit own (households, sectors) | view | — |
| Exports | ✓ | ✓ | ✓ | — | — |
| Access log | ✓ | — | — | — | — |
| See own plan, installments, trainings; send monthly update | — | — | — | — | ✓ |

---

## Run locally

Requirements: Node.js 18+ and MongoDB (local or a free MongoDB Atlas cluster).

```bash
# 1. settings
cp server/.env.example server/.env      # then edit MONGO_URI and JWT_SECRET

# 2. install + build
npm run build

# 3. (optional) demo data: 5 Mauzes, ~134 households, 20 cases in every situation
npm run seed:reset

# 4. start
npm start            # → http://localhost:5000
```

For development with hot reload, run `npm run dev:server` and `npm run dev:client` in two terminals, then open http://localhost:5173 (API calls are proxied to port 5000).

### Logins

On first start, if the database has no users, an HQ admin is created from `ADMIN_MOBILE` / `ADMIN_PASSWORD` in `.env` (default `9999999999` / `Admin@123`). **Change it after first login.**

After `npm run seed:reset`, demo logins (password `Demo@123`):

| Role | Mobile |
|---|---|
| ZBC (Vidarbha Zone) | 9000000001 |
| Mauze head, Pandharkawada | 9000000100 |
| Counsellor, Pandharkawada | 9000000201 |
| Family app | 9000000099 |

`npm run seed` without `--reset` adds demo data to the existing database. For production, start empty and create zones, Mauzes and users from the admin panel.

---

## Deploy

### Option A: Vercel (one project, two services) + MongoDB Atlas

`vercel.json` already defines both services: `/api/*` goes to the Express server (`server/`), everything else goes to the Vite app (`client/`). The site, admin panel, family app and API all share one domain.

1. **MongoDB Atlas**: create a free cluster and a database user. Under **Network Access**, add `0.0.0.0/0`, because Vercel functions use changing IP addresses. Copy the connection string and add a database name, e.g. `.../upliftment?retryWrites=true&w=majority`.
2. **Vercel**: import the repo with the **project root** as Root Directory. Vercel reads `vercel.json` and shows the `client` and `server` services. Keep them grouped as one project.
3. **Environment variables** (Production and Preview):
   ```
   MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/upliftment?retryWrites=true&w=majority
   JWT_SECRET=<long random string>
   JWT_EXPIRES=7d
   ADMIN_NAME=HQ Administrator
   ADMIN_MOBILE=<your mobile>
   ADMIN_PASSWORD=<strong password>
   ```
   Don't set `PORT`, `CLIENT_ORIGIN` or `VITE_API_URL` on Vercel.
4. Deploy, open `https://<project>.vercel.app/login` and log in with `ADMIN_MOBILE` / `ADMIN_PASSWORD`. The admin account is created on the first API request. Change the password from your account page.
5. Optional demo data: on your computer, put the same `MONGO_URI` in `server/.env` and run `npm run seed:reset`. This wipes the database, so do it only before real use.

Vercel notes:
- Evidence files are stored inside MongoDB (GridFS), not on disk, so they survive redeploys. Each file must be under 4 MB because of Vercel's request size limit.
- Early warnings are refreshed whenever the dashboard or case list loads, so no background job is needed.

### Option B: Render / Railway (one web service)

- Build command: `npm run build`
- Start command: `npm start`
- Same environment variables as above, plus `NODE_ENV=production`.

### Option C: VPS (Hostinger / DigitalOcean) with PM2 + Nginx

```bash
git clone <repo> upliftment && cd upliftment
cp server/.env.example server/.env && nano server/.env
npm run build
npm i -g pm2 && pm2 start "npm start" --name upliftment && pm2 save && pm2 startup
```

Nginx: proxy your domain to `http://127.0.0.1:5000` and add HTTPS with Certbot (the family app needs HTTPS to install).

---

## The family app

`/app` is a Progressive Web App. On Android (Chrome), open the site → menu → **Install app / Add to Home screen**; on iPhone (Safari) → Share → **Add to Home Screen**. It opens full-screen with its own icon. The app shell works offline; family data is never cached on the phone.

To publish on the Play Store later, wrap the same URL as a Trusted Web Activity (for example with Bubblewrap / PWABuilder). No code changes are needed.

Families get their login from their counsellor: **Case → Plan → Family app → Issue login**.

---

## Project structure

```
server/
  src/index.js            Express app (exported for Vercel; listens on PORT elsewhere), security, static frontend
  src/models/             Zone, Mauze, User, Household, Case (beneficiary record), Grievance, Enquiry, AuditLog
  src/routes/             auth, public, org, users, households, cases, dashboard, inbox, portal, uploads
  src/utils/warnings.js   early-warning rules, improvement vs baseline, financial measurements
  src/seed.js             demo data
client/
  src/pages/public/       website: home, how it works, request support, concerns, login
  src/pages/admin/        dashboard, early warnings, cases (+ case record tabs), households, inbox, team, Mauzes, reports
  src/pages/app/          family app: my plan, progress, repayments, account
  public/                 PWA manifest, service worker, icons
```

## API overview

All endpoints are under `/api` and use `Authorization: Bearer <token>` except `/api/public/*` and `/api/auth/login`.

- `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`
- `GET /public/mauzes`, `GET /public/stats`, `POST /public/enquiry`, `POST /public/grievance`, `GET /public/grievance/track`
- `/org/zones`, `/org/mauzes` (CRUD), `/users` (CRUD), `/users/staff`
- `/households` (list with filters, CRUD)
- `/cases`: list / create / get / update plan; `PATCH /:id/status`; `PUT /:id/feasibility`; `POST /:id/decision`; `POST /:id/disbursements`; `POST /:id/repayments/schedule`; `POST /:id/repayments/:rid/pay`; `POST|PUT|DELETE /:id/{utilizations|monthlyUpdates|visits|trainings|alerts}`; `POST /:id/utilizations/:sid/verify`; `PUT /:id/outcome/{6|12}`; `POST /:id/beneficiary-login`
- `GET /dashboard`, `POST /dashboard/recompute-risk`, `GET /dashboard/export/{cases|households}.csv`, `GET /dashboard/audit`
- `/inbox/enquiries`, `/inbox/grievances`
- `/portal/cases`, `POST /portal/cases/:id/monthly` (family app)
- `POST /uploads` (evidence files: JPG / PNG / WEBP / PDF, 4 MB max, stored in MongoDB GridFS), `GET /files/:id?t=<token>` (staff only)

Final sanction authority and financial controls remain as specified by HQ and scheme policy; the system records and supports those decisions.
