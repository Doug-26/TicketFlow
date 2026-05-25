# TicketFlow

A small internal **support-ticket management** app built end-to-end as a learning project. Employees raise tickets against a department, an admin or department head assigns them, and the assignee changes status as they work through it. Status changes are audited.

> **Status:** MVP feature-complete. All 5 original goals (DB → API → Angular → integration) are done. See the [Roadmap](#roadmap) for what's next.

---

## Tech stack

| Layer    | Tech |
|----------|------|
| Database | SQL Server (LocalDB for dev) — 8 tables, seeded |
| API      | ASP.NET Core Web API, EF Core (hand-written models, no migrations), JWT auth, BCrypt password hashing, Swagger |
| Web      | Angular 21 (standalone components, signals), Tailwind CSS 4, functional interceptor + role guards, dark/light theme |
| Auth     | JWT (bearer token) with `Role` claim for `[Authorize(Roles=…)]` and `roleGuard([…])` |

---

## Features

**Roles:** `Employee`, `Admin`, `HR`.

- **Master data (Admin)** — single page with 5 tabs: Departments, Request Types, **Request Type Fields**, Roles, Department Heads.
- **Dynamic ticket form** — each Request Type defines its own fields (text / number / select / radio / checkbox / date). The Raise-Ticket form is built live from those definitions and the answers are stored as JSON.
- **Tickets** — list with `All` / `Mine` / `Assigned to me` scope + status filter. Detail page has a status-change card (raiser / assignee / admin), Admin-only assign card, and a `TicketStatusHistory` timeline.
- **Employees (HR/Admin)** — create / edit / deactivate; password hashed with BCrypt; role + department selects.
- **Dashboard** — live counts (All / Open / Closed) and the 5 most recent tickets, computed client-side from `GET /api/tickets`.
- **Dark / light theme** — class-strategy Tailwind, signal-driven toggle, persisted to localStorage with OS-preference fallback.

---

## Prerequisites

| Tool | Version (tested with) |
|------|----------------------|
| .NET SDK | 8.0+ (the project also builds on .NET 10 preview) |
| Node.js | 20+ (tested on 24) |
| Angular CLI | 21.x |
| SQL Server | LocalDB (`(localdb)\MSSQLLocalDB`) or any local instance — adjust connection string |
| SSMS | 19+ for running the seed script |

---

## Quick start

### 1. Database

Open `db/01_create_ticketflow_db.sql` in SSMS and execute it once. It will:

- Create the `TicketFlowDb` database
- Create all 8 tables (`Roles`, `Departments`, `Employees`, `DepartmentHeads`, `RequestTypes`, `RequestTypeFields`, `Tickets`, `TicketStatusHistory`)
- Seed: 3 roles, 2 departments, 4 employees (1 admin / 1 HR / 2 IT), 1 active department head, 2 request types with their fields

> The seeded employees ship with `PLACEHOLDER_HASH`. The API's `PasswordSeeder` background service replaces them with real BCrypt hashes on first startup, so login works immediately afterwards.

To re-run cleanly: `DROP DATABASE TicketFlowDb;` first, then execute the script again.

### 2. API

```bash
cd api/TicketFlow.Api
dotnet run
```

The API listens on `http://localhost:5177`. Open Swagger at <http://localhost:5177/swagger>.

**Connection string** is in `appsettings.json`:

```
Server=(localdb)\\MSSQLLocalDB;Database=TicketFlowDb;Trusted_Connection=True;TrustServerCertificate=True
```

Change it if you use a different SQL Server instance (e.g. `Server=.\SQLEXPRESS`).

### 3. Web

```bash
cd web/ticketflow-web
npm install        # first run only
ng serve -o
```

App opens at `http://localhost:4200`. CORS for that origin is already configured in the API.

---

## Seeded users

All passwords are `Password@123` (set by `PasswordSeeder` on first API run).

| Email                       | Role     | Department |
|-----------------------------|----------|------------|
| `admin@ticketflow.local`    | Admin    | —          |
| `hr@ticketflow.local`       | HR       | HR         |
| `john@ticketflow.local`     | Employee | IT (head)  |
| `jane@ticketflow.local`     | Employee | IT         |

---

## Project structure

```
TicketFlow/
├── db/
│   └── 01_create_ticketflow_db.sql      # one-shot schema + seed
├── api/
│   └── TicketFlow.Api/
│       ├── Program.cs                   # DI, JWT, CORS, Swagger, DbContext wiring
│       ├── Controllers/                 # 9 controllers (Auth + 8 entities)
│       ├── Data/TicketFlowDbContext.cs  # DbSet<T> per table, no migrations
│       ├── Models/                      # plain C# classes — 1 per table
│       ├── Dtos/                        # request + response shapes
│       └── Services/
│           ├── JwtTokenService.cs       # builds the JWT
│           └── PasswordSeeder.cs        # one-shot BCrypt replacement at startup
└── web/
    └── ticketflow-web/
        └── src/app/
            ├── app.config.ts            # provideHttpClient(withInterceptors), provideRouter
            ├── app.routes.ts            # lazy-loaded, guarded by authGuard / roleGuard
            ├── constants/               # role names, storage keys
            ├── models/                  # TS interfaces matching API DTOs
            ├── services/                # AuthService, ThemeService, HttpClient wrappers
            └── components/
                ├── shell/               # sidebar + topbar (theme toggle, logout)
                ├── login/
                ├── dashboard/           # 3 stat cards + recent tickets
                ├── master/              # 5 tabs: Departments / RequestTypes / Fields / Roles / Heads
                ├── employees/           # HR/Admin top-level page
                └── tickets/             # list, create (dynamic form), detail (history + assign)
```

---

## Architecture decisions

A few choices worth knowing about:

- **Hand-written EF Core models, no migrations.** The SQL script is the source of truth. EF just maps to existing tables. This keeps things readable for a .NET beginner and avoids surprises when schema and code drift.
- **Single `Employees` table for all users.** `RoleId` distinguishes Admin / Employee / HR. One join, one identity source.
- **`DepartmentHeads` is a separate table** (not a column on `Departments`) with `IsActive` + a filtered unique index — keeps an audit trail of head changes while enforcing "one active head per department".
- **Request-type fields are normalized** (`RequestTypeFields` table), but **ticket answers are stored as JSON** in `Tickets.FieldValues`. Builds the dynamic form cleanly without a separate `TicketFieldValues` table.
- **JWT role claim** is `ClaimTypes.Role = employee.Role.Name`, so `[Authorize(Roles = "Admin")]` and Angular's `roleGuard(['Admin'])` both just work.
- **Functional interceptor + guards on the Angular side** — the modern (Angular 21) style. No classes, no `HTTP_INTERCEPTORS` token, no `CanActivate` classes.
- **Signals everywhere on the Angular side.** `AuthService.currentUser`, `ThemeService.theme`, panel state. UI re-renders without `subscribe` boilerplate.
- **Soft delete** for tables referenced by FKs (Departments, Employees, Roles, RequestTypes). Hard delete is reserved for `RequestTypeFields` (no inbound FKs) and `Tickets` (Admin only, cascades history rows).
- **HTTPS redirection is off in development** — the API runs HTTP-only on `5177` so Swagger and the Angular dev server don't hit the untrusted dev cert. Re-enabled automatically when `ASPNETCORE_ENVIRONMENT != Development`.

---

## API endpoints (cheat sheet)

All endpoints require `Authorize: Bearer <jwt>` unless noted.

| Verb | Route | Notes |
|---|---|---|
| POST | `/api/auth/login` | public — returns `{ token, employeeId, fullName, role, departmentId }` |
| GET / POST / PUT / DELETE | `/api/departments` | Admin for writes |
| GET / POST / PUT / DELETE | `/api/requesttypes` (+ `/by-department/{id}`) | Admin for writes |
| GET / POST / PUT / DELETE | `/api/requesttypefields` (+ `/by-type/{id}`) | Admin for writes; DELETE is hard |
| GET / POST / PUT / DELETE | `/api/roles` | Admin for writes |
| GET / POST / DELETE | `/api/departmentheads` (+ `/by-department/{id}`) | Admin only; POST auto-deactivates previous active head |
| GET / POST / PUT / DELETE | `/api/employees` (+ `/by-department/{id}`) | HR/Admin can create/update, Admin can deactivate |
| GET | `/api/tickets?status=&mine=&assigned=` | any logged-in user |
| POST | `/api/tickets` | raiser pulled from JWT |
| PUT | `/api/tickets/{id}/assign` | Admin only |
| PUT | `/api/tickets/{id}/status` | raiser / assignee / Admin; auto-writes a history row |
| DELETE | `/api/tickets/{id}` | Admin only; cascades history rows |
| GET | `/api/ticketstatushistory/by-ticket/{id}` | timeline for a ticket |

---

## Roadmap

Concrete improvements I'd consider next:

- [ ] **Polish UX** — toast notifications, skeleton loaders, mobile-responsive sidebar, replace `confirm()` with a proper dialog
- [ ] **Auto-assignment** — round-robin pick from active employees in the ticket's department (the original spec called for this; currently manual)
- [ ] **Pagination + search** on the Tickets list (API + UI)
- [ ] **Tests** — xUnit for a couple of controllers, Jasmine specs for `AuthService`
- [ ] **Deploy** — Azure App Service for the API, Azure Static Web App for the SPA, or a single VM
- [ ] **Refresh tokens** — currently the JWT expires after 8 hours and the user logs in again
- [ ] **Notifications** — email or in-app when a ticket is assigned to you / status changes
