# Digital Heroes

### Your game can do more.

> A golf subscription platform that turns every scorecard into a chance to win while creating measurable impact through charity.

[![Live Demo](https://img.shields.io/badge/Live-Digital%20Heroes-success?style=for-the-badge)](https://digital-heroes-six-eta.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/nandkishor008/digital-heroes)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

## Live Application

### [Open Digital Heroes](https://digital-heroes-six-eta.vercel.app)

**Production:**  
https://digital-heroes-six-eta.vercel.app

**Source Code:**  
https://github.com/nandkishor008/digital-heroes

---

## About the Project

Digital Heroes is a full-stack subscription platform built around golf, rewards, and charitable impact.

Subscribers maintain a rolling card of five Stableford scores. These five scores become their numbers for a monthly prize draw.

At the same time, every subscription contributes a percentage toward a charity selected by the subscriber.

The product brings together golf, rewards, subscriptions, and charitable impact into a single experience.

The application was developed based on the Digital Heroes PRD (Level 1, March 2026).

### Product Flow

```text
Register
   |
   v
Choose Subscription
   |
   v
Choose Charity and Contribution %
   |
   v
Maintain 5 Stableford Scores
   |
   v
Monthly Draw
   |
   +-------------------+
   |                   |
   v                   v
3 / 4 / 5 Matches    Jackpot
   |                   |
   +---------+---------+
             |
             v
          Winnings
             |
             v
        Upload Proof
             |
             v
      Admin Verification
             |
             v
           Payout
```

---

# Features

## Public Experience

Visitors can:

- Explore the Digital Heroes platform
- Understand how the product works
- Browse charities
- View individual charity information
- View public draw information
- Learn about Digital Heroes
- Register for an account
- Sign in

---

## Authentication

The application provides:

- User registration
- User login
- Logout
- JWT-based authentication
- Protected routes
- Role-based access control
- Subscriber authorization
- Administrator authorization

### Supported Roles

| Role | Access |
| --- | --- |
| Public Visitor | Public pages |
| Subscriber | Player dashboard and account features |
| Administrator | Control Room and management features |

---

# Subscriber Features

## Personal Dashboard

The subscriber dashboard provides an overview of:

- Membership status
- Current prize pool
- Next draw
- Latest Stableford score
- Number of retained scores
- Charity contribution
- Winnings
- Account information

---

## Stableford Score Management

Subscribers maintain a rolling card of five Stableford scores.

### Rules

- Valid score: 1–45
- Scores must be whole numbers
- One score per date
- Duplicate dates are rejected
- Maximum of five scores are retained
- Scores can be edited
- Scores can be deleted
- Scores are displayed newest first

### Rolling Five-Score Logic

When a sixth score is submitted:

```text
Existing Scores

Score 1
Score 2
Score 3
Score 4
Score 5


New Score Added

Score 1  <- Removed
Score 2
Score 3
Score 4
Score 5
Score 6  <- Newest
```

The oldest score is automatically removed.

The removal happens within the same database transaction.

---

# Monthly Draw

The player's five retained Stableford scores become their five draw numbers.

There is no separate number picker.

```text
Five Stableford Scores
          |
          v
   Five Draw Numbers
          |
          v
    Monthly Draw
```

The draw supports:

- Random selection
- Algorithmic selection
- 3-number matches
- 4-number matches
- 5-number jackpot
- Multiple winners
- Equal prize splitting
- Jackpot rollover

---

# Draw Selection

Administrators can choose between two draw-selection methods.

## Random

Five distinct numbers are selected uniformly.

## Algorithmic

The algorithm calculates a weight for every number:

```text
Weight = 1 + Number of appearances
```

This means commonly submitted numbers have a higher selection weight while every number retains a non-zero probability.

---

# Prize Pool

A configurable portion of subscription revenue contributes to the monthly prize pool.

### Default allocation

```text
30% of subscription revenue
```

### Prize Distribution

| Match | Prize Pool Share | Rollover |
| --- | ---: | --- |
| 5 Numbers | 40% | Yes |
| 4 Numbers | 35% | No |
| 3 Numbers | 25% | No |

If multiple players match the same tier, the amount for that tier is divided equally.

---

## Jackpot Rollover

If nobody matches all five numbers:

```text
5-Number Jackpot
       |
       v
No Winner
       |
       v
Jackpot Rolls Over
       |
       v
Next Monthly Draw
```

The rollover is added to the next five-number jackpot.

---

# Winnings and Verification

When a subscriber wins, the winning record is initially pending.

The workflow is:

```text
Winning Created
      |
      v
Pending
      |
      v
Winner Uploads Proof
      |
      v
Submitted
      |
      v
Administrator Review
      |
   +--+--+
   |     |
   v     v
Approved Rejected
   |       |
   v       v
Payment   Resubmit
Pending
   |
   v
Paid / Settled
```

### Winner Features

Subscribers can:

- View winnings
- View winning tier
- View prize amount
- Upload proof
- Track verification status
- Track payment status

Administrators can:

- Review proof
- Approve winners
- Reject proof
- Allow resubmission
- Track payment
- Record payout references

The backend prevents payment from being released for an unverified winning entry.

---

# Charity System

Charity is a core part of Digital Heroes.

Every subscriber selects a charity and directs a percentage of their subscription toward it.

### Contribution Rules

```text
Minimum: 10%
Maximum: 100%
```

Subscribers can:

- Browse charities
- View charity details
- Select a charity
- Change their selected charity
- Increase their contribution
- View contribution history

---

## Charity Ledger

Contributions are stored in a dedicated ledger when a payment succeeds.

This allows the platform to maintain actual contribution records rather than relying on estimated totals.

One-off donations are also supported.

If a charity with existing supporters is deleted, it is retired rather than physically removed so historical contribution data remains intact.

---

# Subscription and Payments

Digital Heroes supports two payment modes.

## Demo Checkout

The application can operate without Stripe credentials.

When:

```env
STRIPE_SECRET_KEY=
```

is empty, the built-in demo checkout activates subscriptions immediately.

This makes the complete assignment flow testable without requiring real payment credentials.

---

## Stripe Checkout

When a valid Stripe secret key is configured:

```text
Subscriber
    |
    v
Create Stripe Checkout
    |
    v
Payment
    |
    v
Server-side Confirmation
    |
    v
Activate Subscription
    |
    v
Record Charity Contribution
```

---

# Admin Control Room

Administrators have access to a dedicated Control Room.

### Admin Sections

```text
Overview
Users & Scores
Subscriptions
Draws
Charities
Winners & Payouts
Reports
```

### Administrator Capabilities

Administrators can:

- View users
- View subscriber scores
- View subscriptions
- Manage charities
- Configure draw settings
- Simulate draws
- Publish draws
- Review winners
- Verify proof
- Track payouts
- View reports
- Monitor charity contributions

---

# Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 |
| Build Tool | Vite |
| Backend | Node.js 18+ |
| API | Express.js |
| Database | PostgreSQL |
| Database Platform | Supabase |
| Authentication | JWT |
| Payments | Stripe / Demo Checkout |
| Deployment | Vercel |
| Version Control | Git + GitHub |
| Styling | Custom CSS |
| Image Assets | Local Assets / Unsplash |

---

# System Architecture

```text
                         +---------------------+
                         |       Browser       |
                         +----------+----------+
                                    |
                                    v
                         +---------------------+
                         |    React + Vite     |
                         |      client/        |
                         +----------+----------+
                                    |
                              REST API
                                    |
                                    v
                         +---------------------+
                         |   Express Backend   |
                         |      server/        |
                         +----------+----------+
                                    |
              +---------------------+---------------------+
              |                     |                     |
              v                     v                     v
       Authentication          Business Logic          Draw Engine
            JWT                  Services              & Rewards
              |                     |                     |
              +---------------------+---------------------+
                                    |
                                    v
                         +---------------------+
                         | PostgreSQL /        |
                         | Supabase            |
                         +---------------------+
```

---

# Project Structure

```text
digital-heroes/
|
├── api/
|   └── index.js
|
├── client/
|   ├── index.html
|   ├── vite.config.js
|   |
|   ├── public/
|   |   ├── favicon.svg
|   |   └── images/
|   |       ├── charity/
|   |       ├── draw/
|   |       ├── golf/
|   |       ├── hero/
|   |       └── impact/
|   |
|   └── src/
|       ├── App.jsx
|       ├── main.jsx
|       ├── styles.css
|       |
|       ├── components/
|       |   ├── Layout.jsx
|       |   └── ui.jsx
|       |
|       ├── lib/
|       |   ├── api.js
|       |   ├── auth.jsx
|       |   └── images.js
|       |
|       └── pages/
|           ├── About.jsx
|           ├── Charities.jsx
|           ├── CharityDetail.jsx
|           ├── Dashboard.jsx
|           ├── DrawPublic.jsx
|           ├── Home.jsx
|           ├── HowItWorks.jsx
|           ├── Login.jsx
|           ├── MyCharity.jsx
|           ├── MyDraws.jsx
|           ├── MyScores.jsx
|           ├── MyWinnings.jsx
|           ├── NotFound.jsx
|           ├── Profile.jsx
|           ├── Register.jsx
|           ├── Subscription.jsx
|           |
|           └── admin/
|               ├── Analytics.jsx
|               ├── Charities.jsx
|               ├── Draws.jsx
|               ├── Overview.jsx
|               ├── Subscriptions.jsx
|               ├── Users.jsx
|               └── Winners.jsx
|
├── db/
|   └── schema.sql
|
├── server/
|   ├── app.js
|   ├── db.js
|   ├── index.js
|   |
|   ├── middleware/
|   |   └── auth.js
|   |
|   ├── routes/
|   |   ├── admin.js
|   |   ├── auth.js
|   |   ├── charities.js
|   |   ├── draws.js
|   |   ├── scores.js
|   |   ├── subscriptions.js
|   |   └── winnings.js
|   |
|   ├── scripts/
|   |   ├── fetch-images.js
|   |   ├── migrate.js
|   |   ├── seed.js
|   |   └── test-draw.js
|   |
|   └── utils/
|       ├── draw.js
|       └── helpers.js
|
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── vercel.json
```

---

# Getting Started

## Prerequisites

Before running the project locally, install:

- Node.js 18+
- npm
- Git
- Supabase account/project

---

## 1. Clone the Repository

```bash
git clone https://github.com/nandkishor008/digital-heroes.git
```

Enter the project:

```bash
cd digital-heroes
```

---

## 2. Install Dependencies

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm --prefix client install
```

---

## 3. Configure Environment Variables

Create your local environment file from the example:

```bash
cp .env.example .env
```

For Windows PowerShell, the file can also be created manually.

Example:

```env
DATABASE_URL=your_supabase_session_pooler_connection_string

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=

PUBLIC_URL=http://localhost:5174

PORT=4000

CORS_ORIGIN=http://localhost:5174
```

### Security

Never commit the real `.env` file.

The repository only contains:

```text
.env.example
```

Your actual credentials must remain local or be stored in Vercel Environment Variables.

---

# Database Setup

Digital Heroes uses PostgreSQL through Supabase.

## Create a Supabase Project

Create a new Supabase project.

Then navigate to:

```text
Supabase
  -> Project Settings
  -> Database
  -> Connection String
  -> Session Pooler
```

Copy the Session Pooler connection string into:

```env
DATABASE_URL=...
```

---

## Initialize the Database

Run:

```bash
npm run setup
```

The setup performs:

```text
Database Migration
       +
Database Seeding
```

It creates:

- Database schema
- Demo accounts
- Charity records
- Subscriber data
- Sample draw
- Winner data

---

# Demo Accounts

## Subscriber

```text
Email: player@digitalheroes.test
Password: Player@12345
```

## Administrator

```text
Email: admin@digitalheroes.test
Password: Admin@12345
```

The seed also creates additional subscriber accounts using the same password.

---

# Run the Application Locally

## Terminal 1 - Backend

```bash
npm run dev
```

Backend:

```text
http://localhost:4000
```

## Terminal 2 - Frontend

```bash
npm run dev:client
```

Frontend normally starts at:

```text
http://localhost:5173
```

If port `5173` is already occupied, Vite automatically uses another available port.

---

# Vercel Deployment

Digital Heroes is deployed as a single Vercel project.

## Production Architecture

```text
                 Vercel
                   |
        +----------+----------+
        |                     |
   React Frontend         Express API
     client/                 /api
        |                     |
        +----------+----------+
                   |
                   v
            Supabase
            PostgreSQL
```

The Express application is exposed through:

```text
api/index.js
```

The React application is built into:

```text
client/dist
```

Deployment configuration is handled by:

```text
vercel.json
```

---

# Vercel Configuration

When importing the repository into Vercel:

```text
Repository:
nandkishor008/digital-heroes

Framework Preset:
Other

Root Directory:
./
```

The project already contains the required `vercel.json` configuration.

---

# Production Environment Variables

Configure these in:

```text
Vercel
-> Project
-> Settings
-> Environment Variables
```

### Required

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
PUBLIC_URL
CORS_ORIGIN
VITE_IMAGE_SOURCE
```

### Optional

```text
STRIPE_SECRET_KEY
```

### Production Values

```text
DATABASE_URL
-> Supabase Session Pooler connection string

JWT_SECRET
-> Long random production secret

JWT_EXPIRES_IN
-> 7d

PUBLIC_URL
-> https://digital-heroes-six-eta.vercel.app

CORS_ORIGIN
-> https://digital-heroes-six-eta.vercel.app

VITE_IMAGE_SOURCE
-> local

STRIPE_SECRET_KEY
-> Leave empty for demo checkout
```

### Secret Variables

The following values must remain private:

```text
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY
```

Never commit these values to GitHub.

---

# Production Deployment

### Live Application

https://digital-heroes-six-eta.vercel.app

### GitHub

https://github.com/nandkishor008/digital-heroes

The production deployment is connected to the GitHub `main` branch.

Future pushes to `main` can trigger a new Vercel deployment.

---

# Testing

## Draw Engine Tests

Run:

```bash
npm run test:draw
```

The draw engine tests include:

- Prize tier distribution
- Equal splitting
- Multiple winners
- Jackpot rollover
- Rollover handling
- Match counting
- Yearly subscription amortization

---

# Functional Test Checklist

## Authentication

- [x] Registration
- [x] Login
- [x] Logout
- [x] JWT authentication
- [x] Protected routes
- [x] Role-based access

## Subscription

- [x] Monthly plan
- [x] Yearly plan
- [x] Demo checkout
- [x] Membership status
- [x] Renewal information
- [x] Cancellation

## Scores

- [x] Add score
- [x] Edit score
- [x] Delete score
- [x] Score validation
- [x] Duplicate date validation
- [x] Five-score rolling logic

## Draw

- [x] Prize pool
- [x] Draw numbers
- [x] Three-number match
- [x] Four-number match
- [x] Five-number jackpot
- [x] Jackpot rollover
- [x] Multiple winners
- [x] Prize splitting

## Charity

- [x] Charity directory
- [x] Charity selection
- [x] Minimum 10%
- [x] Contribution adjustment
- [x] Contribution history

## Winnings

- [x] Winning records
- [x] Proof upload
- [x] Verification status
- [x] Admin verification
- [x] Rejection/resubmission
- [x] Payment tracking

## Administration

- [x] Admin dashboard
- [x] User management
- [x] Subscription management
- [x] Draw management
- [x] Charity management
- [x] Winner management
- [x] Reports

---

# Design System

Digital Heroes intentionally avoids the visual language of a traditional golf dashboard.

The interface is designed as an editorial publication rather than a collection of dashboard cards.

### Design Principles

- Warm paper-inspired backgrounds
- Deep forest visual sections
- Muted gold for money-related information
- Clay tones for alerts
- Large editorial typography
- Generous whitespace
- Minimal borders
- Small corner radii
- Photography-driven layouts
- Responsive design

### Typography

The application uses:

- Manrope for the main interface
- Newsreader Italic for selected statements

### UI Philosophy

The design focuses on:

```text
Large typography
        +
Editorial spacing
        +
Photography
        +
Meaningful statistics
        +
Human impact
```

---

# Image System

All image references are maintained in:

```text
client/src/lib/images.js
```

Local images are stored in:

```text
client/public/images/
```

The deployed application uses:

```env
VITE_IMAGE_SOURCE=local
```

Images can be downloaded using:

```bash
npm run fetch-images
```

The application includes fallback behavior for failed image loading.

---

# Security

The application includes:

- JWT authentication
- Protected routes
- Role-based authorization
- Admin authorization
- Server-side validation
- Transactional database operations
- Environment-based secrets
- Server-side winner verification
- Payment verification logic

Sensitive environment variables are not stored in the repository.

---

# Database

The database schema is located at:

```text
db/schema.sql
```

The application uses PostgreSQL through Supabase.

Major database entities include:

```text
Users
Subscriptions
Scores
Charities
Charity Contributions
Draws
Draw Entries
Winnings
Payments
Settings
```

Critical multi-step operations use database transactions to maintain consistency.

---

# Business Rules

## Subscriber Eligibility

A subscriber is eligible for a draw only when:

```text
Active Subscription
        +
Five Scores
        =
Eligible Entry
```

---

## Score Rules

```text
Minimum Score: 1
Maximum Score: 45
Maximum Retained Scores: 5
One Score Per Date
```

---

## Prize Rules

```text
5 Match -> 40%
4 Match -> 35%
3 Match -> 25%
```

The five-number jackpot rolls over when unclaimed.

---

## Charity Rules

```text
Minimum Contribution: 10%
Maximum Contribution: 100%
```

---

# Known Scope Boundaries

The following limitations are intentionally documented for the assignment/demo scope.

### Winner Proof Storage

Proof screenshots are currently stored as data URLs in PostgreSQL.

For a larger production system, this should be moved to object storage with signed URLs.

### Email Notifications

The application currently does not send emails.

Winner notifications are displayed inside the subscriber dashboard.

### Draw Scheduling

Draw publication is currently administrator-triggered.

A scheduled job could automate monthly draw execution in a future production version.

### Supabase Row Level Security

Supabase Row Level Security is not enabled because authorization is handled by the Express API layer.

---

# Future Improvements

Potential production enhancements include:

- Object storage for winner proof
- Automated monthly draw scheduling
- Email notifications
- SMS or push notifications
- Stripe webhooks
- Automated subscription renewals
- Advanced analytics
- Audit logs
- Supabase Row Level Security
- Automated backups
- Image optimization
- CDN optimization
- Custom production domain
- CI/CD testing
- Automated deployment checks

---

# Application Routes

## Public

```text
/
/how-it-works
/charities
/charities/:id
/draw
/about
/login
/register
```

## Subscriber

```text
/dashboard
/scores
/draws
/winnings
/charity
/subscription
/profile
```

## Administrator

```text
/admin
/admin/users
/admin/subscriptions
/admin/draws
/admin/charities
/admin/winners
/admin/reports
```

---

# Useful Commands

### Install

```bash
npm install
npm --prefix client install
```

### Database Setup

```bash
npm run setup
```

### Backend

```bash
npm run dev
```

### Frontend

```bash
npm run dev:client
```

### Draw Tests

```bash
npm run test:draw
```

### Download Images

```bash
npm run fetch-images
```

---

# Project Details

| Item | Details |
| --- | --- |
| Project | Digital Heroes |
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL / Supabase |
| Authentication | JWT |
| Payments | Stripe-ready + Demo Checkout |
| Deployment | Vercel |
| Version Control | GitHub |
| Live Demo | https://digital-heroes-six-eta.vercel.app |
| Repository | https://github.com/nandkishor008/digital-heroes |

---

# Demo Credentials

## Subscriber Account

```text
Email:
player@digitalheroes.test

Password:
Player@12345
```

## Administrator Account

```text
Email:
admin@digitalheroes.test

Password:
Admin@12345
```

These accounts are intended for assignment evaluation and demonstration.

---

# Project Purpose

This project was developed as a full-stack software development assignment based on the Digital Heroes product requirements.

It demonstrates:

- Product requirement interpretation
- Full-stack application development
- REST API design
- Authentication and authorization
- PostgreSQL database design
- Business logic implementation
- Draw and prize calculation
- Subscription workflows
- Charity contribution tracking
- Admin operations
- Responsive UI/UX
- Production deployment
- Cloud database integration
- Error handling and validation

---

# License

This project was developed as a software development assignment and demonstration project.