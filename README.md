# Digital Heroes

A subscription platform where golfers keep a rolling card of five Stableford
scores, those five scores become their entry to a monthly prize draw, and part
of every subscription goes to a charity the subscriber chooses.

Built against the Digital Heroes PRD (Level 1, March 2026).

```
React 18 + Vite          →  client/
Node 18 + Express        →  server/  (also runs as a Vercel function via api/)
PostgreSQL (Supabase)    →  db/schema.sql
Stripe Checkout          →  optional; a demo checkout runs without keys
```

---

## 1. Run it locally

You need Node 18 or newer and a PostgreSQL database. A free Supabase project is
the quickest way to get one.

```bash
# 1. install
npm install
npm --prefix client install

# 2. configure
cp .env.example .env
#    then open .env and paste your DATABASE_URL and a JWT_SECRET

# 3. create the schema and load demo data
npm run setup          # = db:migrate + db:seed

# 4. start both processes (two terminals)
npm run dev            # API  → http://localhost:4000
npm run dev:client     # app  → http://localhost:5173
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to port 4000,
so there is nothing else to configure.

### Test credentials

The seed creates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@digitalheroes.test` | `Admin@12345` |
| Subscriber | `player@digitalheroes.test` | `Player@12345` |
| Eight more subscribers | `aisha@example.com`, `vikram@example.com`, `meera@example.com`, `daniel@example.com`, `sana@example.com`, `arjun@example.com`, `nisha@example.com`, `kabir@example.com` | `Player@12345` |

The sign-in page has two buttons that fill these in for you.

The seed also publishes one past draw with real winners, so the winner
verification and payout screens have something in them on first load.

---

## 2. Getting a database

1. Create a **new** Supabase project (the PRD asks for a new one, not a personal
   or existing project).
2. Project settings → Database → Connection string → **URI**, and switch the
   mode to **Session pooler**. Copy it into `DATABASE_URL`.
3. Replace `[YOUR-PASSWORD]` in that string with the database password you set
   when creating the project.
4. Run `npm run setup`.

If you would rather not run the migration script, paste the contents of
`db/schema.sql` into the Supabase SQL editor and run it there, then run
`npm run db:seed`.

---

## 3. Deploying to Vercel

The repository deploys as one Vercel project: the React build is served as
static files and the whole Express app runs as a single serverless function
mounted at `/api`.

1. Push this folder to a Git repository.
2. In a **new** Vercel account, import the repository. Leave the framework
   preset as *Other* — `vercel.json` already sets the build command and output
   directory.
3. Add these environment variables in the Vercel project settings:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Supabase session-pooler connection string |
   | `JWT_SECRET` | a long random string |
   | `PUBLIC_URL` | your deployed URL, e.g. `https://digital-heroes.vercel.app` |
   | `STRIPE_SECRET_KEY` | optional; leave unset to keep demo checkout |

4. Deploy, then run `npm run setup` once from your machine with the same
   `DATABASE_URL` so the deployed app has a schema and seed data.

Because the client and the API are served from the same origin, no CORS
configuration or `VITE_API_URL` is needed in production.

---

## 4. How the product works

### Scores

- Stableford points, a whole number from 1 to 45.
- One score per date. A second score on a date already used is rejected; the
  existing entry can be edited or deleted instead.
- Exactly five scores are retained. Posting a sixth deletes the oldest in the
  same transaction, and the response tells the user which round dropped off.
- Scores always display newest first.

### The draw

A player's five retained scores **are** their five draw numbers. Both the score
range and the draw range are 1–45, so the scorecard is the ticket — there is no
separate number picker. The PRD does not say where the numbers come from, and
this reading is the one that makes keeping the card current matter.

Two selection methods, chosen per draw by an administrator:

- **Random** — uniform selection of five distinct numbers.
- **Algorithmic** — weighted selection, where each number's weight is
  `1 + (how often it appears across all submitted cards)`. Common scores come up
  more often, but every number keeps a non-zero chance.

A player's tier is how many of their numbers appear in the winning five.

### Prize pool

A configurable share of subscription revenue (30% by default, editable in
Draw management) forms the pool. Yearly plans are amortised across twelve months
so a yearly subscriber contributes the same each month as a monthly one.

| Match | Share | Rolls over |
| --- | --- | --- |
| 5 numbers | 40% | Yes — the jackpot carries into the next draw when unclaimed |
| 4 numbers | 35% | No |
| 3 numbers | 25% | No |

Each tier is divided equally between everyone who matched it. Incoming rollover
is added to the 5-number tier before it is split.

### Draw operations

Administrators simulate a month as many times as they like. A simulation saves
a draft draw, so the numbers reviewed are the numbers published. Publishing is
one transaction: every eligible card is written as a `draw_entry`, winners get a
`winnings` row at `verification_status = 'pending'`, and any unclaimed jackpot
is recorded as `rollover_out` for the next month to pick up.

Only subscribers with an active plan **and** a full card of five scores are
entered.

### Winner verification

```
win created (pending)
   → winner uploads a screenshot of their scores      (submitted)
   → administrator approves or rejects                (approved / rejected)
   → approved wins can be marked paid, with a reference (payment: pending → paid)
```

A rejected win can be resubmitted. Payment cannot be released on an unverified
win — the API blocks it, not just the interface.

### Charity

Every subscriber picks a charity at signup and gives at least 10% of their fee,
adjustable up to 100%. Contributions are written to a `charity_contributions`
ledger at the moment a payment succeeds, so the totals on the directory and in
the admin reports are real sums rather than derived estimates. One-off donations
are recorded in the same ledger with `source = 'donation'` and are not tied to
the draw.

Deleting a charity that has supporters retires the listing instead of removing
it, so the giving history stays intact.

---

## 5. Payments

With `STRIPE_SECRET_KEY` set, subscribing creates a Stripe Checkout session and
the return trip is confirmed server-side against the Stripe API before anything
is activated. Without a key, the platform runs a demo checkout that activates
the plan immediately — the whole subscribe → score → draw → win → payout flow is
testable without payment credentials, which is what the assignment needs.

Either way the same `activate()` function creates the subscription, stores the
charity split and writes the ledger entry in one transaction.

Cancelling sets `cancel_at_period_end`; access continues until the period ends,
after which the subscription lazily flips to `expired` on the next authenticated
request.

---

## 6. Project layout

```
digital-heroes/
├── api/index.js               Vercel serverless entry (re-exports the Express app)
├── db/schema.sql              Full PostgreSQL schema, idempotent
├── server/
│   ├── app.js                 Express app: routes, static client, error handler
│   ├── index.js               Local dev listener
│   ├── db.js                  pg pool + query/one/many/tx helpers
│   ├── middleware/auth.js     JWT, live subscription check, role guards
│   ├── utils/draw.js          Draw engine (pure, no DB) + prize distribution
│   ├── utils/helpers.js       Periods, settings, validation, async wrapper
│   ├── routes/                auth, subscriptions, scores, charities, draws,
│   │                          winnings, admin
│   └── scripts/               migrate.js, seed.js, test-draw.js,
│                              fetch-images.js
└── client/
    ├── index.html
    ├── vite.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── images/            hero, golf, charity, impact, draw
    └── src/
        ├── App.jsx            All routes, public / user / admin
        ├── styles.css         Design tokens and every component style
        ├── lib/               api.js (fetch + formatting), auth.jsx (context),
        │                      images.js (the photography manifest)
        ├── components/        Layout.jsx (nav, guards, shells),
        │                      ui.jsx (Photo, Reveal, CountUp, states)
        └── pages/             8 public, 7 subscriber, 7 admin screens
```

### Pages

**Public** — Home, How it works, Charities, Charity detail, The draw, About,
Sign in, Register.

**Subscriber** — Overview, My scores, My draws, Winnings, My charity,
Subscription, Profile.

**Administrator** — Control room, Users & scores, Subscriptions,
Draw management, Charities, Winners & payouts, Reports.

---

## 7. Checking the money logic

```bash
npm run test:draw
```

Runs assertions against the draw engine with no database involved: tier shares,
equal splitting between tied winners, jackpot rollover when the 5-tier is
unclaimed, rollover being added to the jackpot rather than spread across tiers,
match counting, and yearly-plan amortisation.

---

## 8. Design system and photography

The interface is deliberately not a dashboard. It is built as an editorial
publication that happens to run a platform: warm paper ground, deep forest for
the full-bleed emotional bands, and a single muted gold reserved exclusively
for money. Charity leads; golf supports.

Rules the stylesheet enforces globally, in `client/src/styles.css`:

- A "card" is a hairline rule and generous space, not a bordered box. Real
  containers (`.panel`) exist but are used only for forms and modals.
- Corner radii are 2–4px. Nothing is a pill except status chips.
- Gradients appear only as photographic scrims, never as decoration.
- One accent per job: forest is brand, gold is money, clay is alert.
- Statistics render as a ruled row (`.figures`), never as four coloured boxes.

Type is Manrope throughout, with Newsreader italic used sparingly for the
emotional statements. The scale is set large on purpose so headlines carry
hierarchy without relying on weight.

### Where the photographs come from

Every image in the application is declared in one file — `client/src/lib/images.js`
— and nowhere else. Swapping a picture is a one-line edit there.

By default images stream from the Unsplash CDN. To hold them locally instead:

```bash
npm run fetch-images       # downloads everything into client/public/images/
```

Then set `VITE_IMAGE_SOURCE=local` in `client/.env`.

The `<Photo>` component handles loading and failure: images fade in when
decoded, and a source that fails to resolve renders a labelled forest block
rather than a broken icon or a collapsed layout. This means a dead URL degrades
quietly instead of breaking a page.

**Please replace these with commissioned or properly cleared photography before
any real launch.** The Unsplash licence permits this use, but a production
product should not ship on stock imagery.


---

---

## 9. Known scope boundaries

Worth naming rather than hiding:

- Proof screenshots are stored as data URLs in Postgres. It keeps the demo to
  one dependency; a production build would put them in object storage and keep
  a signed URL.
- There is no email delivery. Winners are notified in their dashboard.
- The draw runs when an administrator publishes it. A scheduled job would run it
  on a cadence; the engine and the publish endpoint are already separated so
  that is a scheduler call, not a rewrite.
- Row-level security is not enabled on the Supabase tables, because all access
  goes through the Express API with its own authorisation rather than through
  the Supabase client.
