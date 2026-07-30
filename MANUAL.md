# TicketFlow — Project Manual

Your future-self cheat sheet. Read this once and you'll have the whole picture back in your head — features, roles, layout, run steps, and the design decisions that will not be obvious from the code.

> Companion to [README.md](README.md). The README is the marketing-style overview; this is the practical operating manual.

---

## 1. What it is (one paragraph)

**TicketFlow** is an internal support-ticket manager. Employees raise tickets against a department, an admin assigns them to a same-department employee, and the assignee (or raiser, or admin) drives the ticket through `Open → InProgress → Closed`. Every status change is written to an audit table. Request Types (e.g. "Laptop Request") define their own **dynamic fields** (RAM, OS, etc.) and the answers are stored as JSON on the ticket. Auth is JWT-based with three roles: `Employee`, `HR`, `Admin`.

---

## 2. Stack + where the pieces live

```
TicketFlow/
├── db/01_create_ticketflow_db.sql       ← one-shot schema + seed
├── api/TicketFlow.Api/                  ← ASP.NET Core Web API (.NET 10)
│   ├── Program.cs                       ← DI, JWT, CORS, Swagger
│   ├── Controllers/                     ← 9 controllers (Auth + 8 entities)
│   ├── Data/TicketFlowDbContext.cs      ← DbSet<T> per table (no migrations)
│   ├── Models/                          ← plain C# classes — 1 per table
│   ├── Dtos/                            ← request + response shapes
│   └── Services/
│       ├── JwtTokenService.cs           ← builds the JWT + role claim
│       └── PasswordSeeder.cs            ← BCrypt-hashes seeded PLACEHOLDER_HASH rows
└── web/ticketflow-web/                  ← Angular 21 + Tailwind 4
    └── src/app/
        ├── app.config.ts                ← provideHttpClient(withInterceptors), provideRouter
        ├── app.routes.ts                ← lazy routes + authGuard / roleGuard
        ├── constants/                   ← ROLES, storage keys, theme names
        ├── models/                      ← TS interfaces mirroring the API DTOs
        ├── services/                    ← HttpClient wrappers, auth, theme, notifications
        └── components/
            ├── shell/                   ← sidebar + topbar (notifications bell, theme, logout)
            ├── login/
            ├── dashboard/               ← 4 stat cards + recent tickets
            ├── master/                  ← 5 tabs (Admin only)
            ├── employees/               ← HR/Admin page
            └── tickets/                 ← list, create (dynamic form), detail (history + assign)
```

| Layer    | Tech                                                                                  |
|----------|---------------------------------------------------------------------------------------|
| Database | SQL Server LocalDB — 8 tables, hand-seeded                                            |
| API      | ASP.NET Core, EF Core (hand-written models, **no migrations**), JWT, BCrypt, Swagger  |
| Web      | Angular 21 standalone components, **signals everywhere**, Tailwind 4, functional interceptor + role guards |

---

## 3. How to run

### 3.1 First-time setup

```powershell
# 1. Create + seed the database (one-time, in SSMS or sqlcmd)
sqlcmd -S "(localdb)\MSSQLLocalDB" -i db\01_create_ticketflow_db.sql

# 2. Install web deps
cd web\ticketflow-web
npm install
```

### 3.2 Daily runs (two terminals)

```powershell
# Terminal A — API on http://localhost:5177 (Swagger at /swagger)
cd api\TicketFlow.Api
dotnet run

# Terminal B — Angular dev server on http://localhost:4200
cd web\ticketflow-web
npx ng serve --port 4200
```

Open http://localhost:4200 and log in.

### 3.3 Reset the database (nuclear)

```sql
USE master; DROP DATABASE TicketFlowDb;
```

Then re-run `db\01_create_ticketflow_db.sql`.

---

## 4. Seeded users

All passwords are `Password@123`. The API's `PasswordSeeder` background service replaces the `PLACEHOLDER_HASH` seed values with real BCrypt hashes on first startup, so login works immediately after `dotnet run`.

| Email                          | Role     | Department | Notes                             |
|--------------------------------|----------|------------|-----------------------------------|
| `admin@ticketflow.local`       | Admin    | —          | Full access to everything         |
| `hr@ticketflow.local`          | HR       | HR         | Can manage employees              |
| `john@ticketflow.local`        | Employee | IT         | Active department head of IT      |
| `jane@ticketflow.local`        | Employee | IT         | Regular employee                  |
| `cjdelacruz@ticketflow.local`  | Employee | IT         | Added post-seed via UI (optional) |

---

## 5. Roles — who can do what

Legend: ✅ allowed, ❌ blocked, — not applicable.

| Action                                          | Employee | HR | Admin |
|-------------------------------------------------|:--------:|:--:|:-----:|
| Log in, see dashboard, toggle theme             | ✅       | ✅ | ✅    |
| Receive header notifications when assigned      | ✅       | ✅ | ✅    |
| See all tickets in the list                     | ✅       | ✅ | ✅    |
| Filter list by All / Mine / Assigned to me      | ✅       | ✅ | ✅    |
| Raise a new ticket                              | ✅       | ✅ | ✅    |
| Open a ticket detail                            | ✅       | ✅ | ✅    |
| Change ticket status (as **raiser** of it)      | ✅       | ✅ | ✅    |
| Change ticket status (as **assignee** of it)    | ✅       | ✅ | ✅    |
| Change ticket status (someone else's ticket)    | ❌       | ❌ | ✅    |
| Assign a ticket to a same-department employee   | ❌       | ❌ | ✅    |
| Delete a ticket (hard delete + cascades history) | ❌      | ❌ | ✅ (API only, no UI yet) |
| View the Employees page                         | ❌       | ✅ | ✅    |
| Create an employee                              | ❌       | ✅ | ✅    |
| Edit an employee                                | ❌       | ✅ | ✅    |
| Deactivate an employee                          | ❌       | ❌ | ✅    |
| View / use Master Data (5 tabs)                 | ❌       | ❌ | ✅    |
| Add / edit / delete Departments                 | ❌       | ❌ | ✅    |
| Add / edit / delete Request Types               | ❌       | ❌ | ✅    |
| Add / edit / delete Request Type Fields         | ❌       | ❌ | ✅    |
| Add / edit / delete Roles                       | ❌       | ❌ | ✅    |
| Assign / rotate Department Heads                | ❌       | ❌ | ✅    |

Enforced in two places:
- **API** — `[Authorize(Roles = "…")]` on controller actions (source of truth).
- **UI** — `roleGuard([...])` on routes and `@if (auth.isAdmin())`-style checks in templates (defensive UX).

---

## 6. Feature walk-through (screen by screen)

### 6.1 Login (`/login`) — public

- Email + password → `POST /api/auth/login`.
- Response: `{ token, employeeId, fullName, role, departmentId }`.
- Token stored in `localStorage['ticketflow.token']`; user info in `localStorage['ticketflow.user']`.
- The token is auto-attached to every subsequent request by [`auth.interceptor.ts`](web/ticketflow-web/src/app/services/auth.interceptor.ts).
- Token lifetime: **8 hours** (`Jwt:ExpiryMinutes` in `appsettings.json`). No refresh tokens — the user logs in again when it expires.

### 6.2 Shell (topbar + sidebar) — every authenticated route

- **Sidebar**: Dashboard, Tickets (everyone), Employees (HR + Admin), Master Data (Admin).
- **Topbar (left → right)**: Notifications bell, theme toggle, user chip, logout.
- **Theme**: Class-strategy Tailwind (`html.dark`), persisted to `localStorage['ticketflow.theme']` with OS-preference fallback. See [`theme.service.ts`](web/ticketflow-web/src/app/services/theme.service.ts).

### 6.3 Dashboard (`/dashboard`)

- Four stat cards: **All tickets · Open · In progress · Closed**, computed client-side from the visible ticket list.
- Recent-tickets list (top 5). Rows link to `/tickets/:id`.

### 6.4 Tickets — list (`/tickets`)

- Three scope tabs — `All` / `My tickets` (I raised) / `Assigned to me` — via `?mine=true` / `?assigned=true` query params on `GET /api/tickets`.
- Status filter dropdown: `Open · In progress · Closed`.
- "Raise ticket" CTA opens `/tickets/new`.

### 6.5 Tickets — create (`/tickets/new`)

The dynamic form pattern is the interesting bit:

1. Pick **Department** → the **Request type** dropdown filters to `RequestType.departmentId === selected` where `isActive`.
2. Pick **Request type** → the component calls `GET /api/requesttypefields/by-type/{id}` and dynamically builds a child `FormGroup` — one `FormControl` per field.
3. Supported field types: `text · number · select · radio · checkbox · date`.
4. On submit, `fields` is `JSON.stringify(...)` and sent as `fieldValues` (a string column on `Tickets`).
5. Title, priority, description are always present. Server auto-generates `TicketNumber = TKT-YYYY-#####` after insert.

> ⚠️ **Gotcha**: `filteredRequestTypes` was originally a `computed()` that read `form.controls.departmentId.value`. `FormControl.value` is a plain property, so the computed's dependency graph never re-tracked it, and the dropdown stayed empty forever. The fix bridges it via a `selectedDepartmentId` signal that gets `.set()` inside a `valueChanges` subscription. **Never read a FormControl value directly inside a `computed()` — always mirror it into a signal.**

### 6.6 Tickets — detail (`/tickets/:id`)

Three cards on the right (each conditional):

- **Assigned to / Updated** — always visible.
- **Change status** — visible to Admin **or** the raiser **or** the current assignee. Sending the new status writes a `TicketStatusHistory` row and updates `Tickets.Status + UpdatedAt`.
- **Assign ticket** (Admin only) — dropdown of active employees in the ticket's department. The API rejects cross-department assignments with 400.

Middle column: description, dynamic field values (rendered from `fieldValues` JSON), and the full **status timeline** from `GET /api/ticketstatushistory/by-ticket/{id}`.

### 6.7 Employees (`/employees`, HR or Admin)

- Table of active employees with role + department.
- "Add employee" side form (name, email, password ≥ 6 chars, role + department dropdowns).
- Row actions: **Edit** (name / role / department), **Deactivate** (Admin only — soft delete via `IsActive = 0`).
- Passwords are BCrypt-hashed on the server. Never sent back.

### 6.8 Master Data (`/master`, Admin only) — five tabs

Deep-linkable: `/master/:tab` where tab is one of `departments`, `types`, `fields`, `roles`, `heads`.

| Tab                  | What it manages                                                                 | Delete style |
|----------------------|---------------------------------------------------------------------------------|--------------|
| Departments          | `Departments` table                                                             | **Soft** (`IsActive=0`) |
| Request Types        | `RequestTypes` table (tied to a department)                                     | **Soft**     |
| Request Type Fields  | `RequestTypeFields` for a chosen RequestType — the definitions of dynamic forms | **Hard**     |
| Roles                | `Roles` table (must match strings the API sees in role claims)                  | **Soft**     |
| Department Heads     | Active head per department + audit trail of previous heads                      | POST auto-deactivates the previous active head; unique filtered index enforces one active per dept |

> ⚠️ **Gotcha**: The Request Type Fields form has a `needsOptions` computed that shows/hides the "Options (comma-separated)" input when the field type is `select` or `radio`. Same anti-pattern as above — it now reads a `fieldTypeSig` signal that's kept in sync via `valueChanges`.

### 6.9 Notifications bell — every screen

- Located at the far-left of the topbar.
- Powered by [`NotificationsService`](web/ticketflow-web/src/app/services/notifications.service.ts) (`providedIn: 'root'`).
- On login, an Angular signal `effect()` starts polling `GET /api/tickets?assigned=true` every **30 seconds** (with an immediate first fetch).
- Compares the returned IDs against a per-user "seen" set in `localStorage['ticketflow.notifs.seen.{employeeId}']`.
- Red badge shows unseen count (`9+` when > 9). Dropdown lists every assigned ticket, unseen ones with an indigo dot + tinted row.
- Clicking a row `markSeen(id)` + navigates to `/tickets/:id`. "Mark all read" clears everything.
- The seen set is pruned every poll — when a ticket is unassigned or reassigned to someone else it drops out.
- Closes on outside click or `Escape`.

### 6.10 Theme toggle

- Signal-driven (`ThemeService.theme` = `'light' | 'dark'`).
- Persisted to `localStorage['ticketflow.theme']`.
- Falls back to `prefers-color-scheme` when no preference has been saved.

---

## 7. Ticket status rules

```
    ┌────────┐   any authorized user   ┌────────────┐   any authorized user   ┌────────┐
    │  Open  │ ─────────────────────▶  │ InProgress │ ─────────────────────▶  │ Closed │
    └────────┘                         └────────────┘                         └────────┘
        ▲                                      │                                   │
        └──────────────────────────────────────┴───────────────────────────────────┘
                          (any transition is allowed — no state machine)
```

- Statuses live as **strings** in `Tickets.Status` (`Open`, `InProgress`, `Closed`) — no enum table.
- API endpoint `PUT /api/tickets/{id}/status` accepts any of the three and always writes a `TicketStatusHistory` row.
- Reject rule: **"already in that status"** (400).
- Permission rule: current user must be Admin, the raiser, or the assignee, else 403.

---

## 8. Data model — 8 tables

| Table                | Notable columns                                                                                                    | Notes                                         |
|----------------------|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| `Roles`              | `RoleId`, `Name`, `IsActive`                                                                                       | Seeded with `Admin`, `Employee`, `HR`         |
| `Departments`        | `DepartmentId`, `Name`, `Description`, `IsActive`                                                                  | Soft delete                                   |
| `Employees`          | `EmployeeId`, `RoleId`, `DepartmentId?`, `FullName`, `Email` (unique), `PasswordHash`, `IsActive`                  | Single user table for all roles               |
| `DepartmentHeads`    | `DepartmentHeadId`, `DepartmentId`, `EmployeeId`, `IsActive`, `StartedAt`, `EndedAt?`                              | Filtered unique index: one active per dept    |
| `RequestTypes`       | `RequestTypeId`, `DepartmentId`, `Name`, `IsActive`                                                                | Soft delete                                   |
| `RequestTypeFields`  | `RequestTypeFieldId`, `RequestTypeId`, `FieldName`, `FieldLabel`, `FieldType`, `FieldOptionsJson`, `IsRequired`, `DisplayOrder` | **Hard delete** — no inbound FKs. `FieldOptionsJson` is a JSON array of strings for `select` / `radio` |
| `Tickets`            | `TicketId`, `TicketNumber`, `RaisedByEmployeeId`, `DepartmentId`, `RequestTypeId`, `AssignedToEmployeeId?`, `Title`, `Description`, `FieldValues`, `Priority`, `Status`, `CreatedAt`, `UpdatedAt` | `FieldValues` = `JSON.stringify(dynamicFormAnswers)`. `TicketNumber` = `TKT-YYYY-#####` |
| `TicketStatusHistory`| `TicketStatusHistoryId`, `TicketId`, `OldStatus?`, `NewStatus`, `ChangedByEmployeeId`, `Remarks?`, `ChangedAt`    | Written on every status change (incl. creation, where `OldStatus = null`) |

---

## 9. API cheat sheet

All routes require `Authorization: Bearer <jwt>` unless marked public.

| Verb   | Route                                              | Access                             | Notes |
|--------|----------------------------------------------------|------------------------------------|-------|
| POST   | `/api/auth/login`                                  | **public**                          | Returns `{ token, employeeId, fullName, role, departmentId }` |
| GET / POST / PUT / DELETE | `/api/departments`                     | Read: any · Write: Admin           | DELETE is soft |
| GET / POST / PUT / DELETE | `/api/requesttypes` + `/by-department/{id}` | Read: any · Write: Admin      | DELETE is soft |
| GET (`by-type/{id}` or `/{id}`) / POST / PUT / DELETE | `/api/requesttypefields`   | Read: any · Write: Admin           | No `GET /` (list-all); DELETE is **hard** |
| GET / POST / PUT / DELETE | `/api/roles`                           | Read: any · Write: Admin           | DELETE is soft |
| GET / POST / DELETE  | `/api/departmentheads` + `/by-department/{id}` | Admin only                         | POST auto-deactivates the previous active head |
| GET / POST / PUT / DELETE | `/api/employees` + `/by-department/{id}` | Read: any · POST + PUT: HR/Admin · DELETE: Admin | DELETE is soft (`IsActive=0`) |
| GET    | `/api/tickets?status=&mine=&assigned=`             | any logged-in user                 | `mine` & `assigned` derive employeeId from JWT |
| POST   | `/api/tickets`                                     | any logged-in user                 | `RaisedByEmployeeId` pulled from JWT |
| PUT    | `/api/tickets/{id}/assign`                         | Admin only                         | Rejects cross-department assignments |
| PUT    | `/api/tickets/{id}/status`                         | Admin / raiser / assignee          | Writes a `TicketStatusHistory` row |
| DELETE | `/api/tickets/{id}`                                | Admin only                         | Hard delete + cascades history rows |
| GET    | `/api/ticketstatushistory/by-ticket/{id}`          | any logged-in user                 | Full timeline |

Swagger UI at http://localhost:5177/swagger has an **Authorize** button — paste the token (no `Bearer ` prefix).

---

## 10. Architecture decisions worth remembering

- **No EF Core migrations.** The SQL script is the source of truth; C# models just map to existing tables. Keeps the schema readable and avoids drift surprises. Consequence: schema changes require editing `db/01_create_ticketflow_db.sql` **and** the matching `Models/*.cs` + `Data/TicketFlowDbContext.cs`.
- **One `Employees` table for all users** (Admin, HR, Employee). `RoleId` FK distinguishes them. One identity source, one join.
- **`DepartmentHeads` is a separate table** with `IsActive` + a filtered unique index — trades a tiny amount of complexity for a full audit trail of head changes.
- **Dynamic field definitions are normalized**, but **ticket answers are stored as JSON** in `Tickets.FieldValues`. This avoids a wide `TicketFieldValues` join table and keeps the form-builder trivial. Trade-off: you cannot query on individual field answers with plain SQL.
- **JWT role claim** is `ClaimTypes.Role = employee.Role.Name` — that's why `[Authorize(Roles = "Admin")]` on the server and `roleGuard(['Admin'])` on the client both work off the same string.
- **Functional interceptor + guards on the Angular side.** No `HTTP_INTERCEPTORS` token, no class-based `CanActivate`.
- **Signals everywhere on the UI.** `AuthService.currentUser`, `ThemeService.theme`, `NotificationsService.unseenCount`. No `subscribe()` in components except for one-shot HTTP calls.
- **Soft delete** for tables referenced by FKs (`Departments`, `Employees`, `Roles`, `RequestTypes`). **Hard delete** for `RequestTypeFields` (no inbound FKs) and `Tickets` (Admin-only; cascades to `TicketStatusHistory`).
- **HTTPS redirection is off in development.** Otherwise the browser bounces `:5177` → `:7115` with an untrusted dev cert, breaking Swagger and fetch. Re-enabled automatically outside `Development`.

---

## 11. Gotchas — the small pit-traps you already stepped in

1. **Never read `FormControl.value` inside a `computed()`.** Plain property, not a signal → no dependency tracked → the computed goes stale. Bridge via a mirror signal set inside `valueChanges.subscribe(...)`. Two places had this bug ([ticket-create.component.ts](web/ticketflow-web/src/app/components/tickets/ticket-create.component.ts), [request-type-fields-panel.component.ts](web/ticketflow-web/src/app/components/master/request-type-fields-panel.component.ts)); both are fixed. If you add another such form, remember.
2. **`dotnet ef migrations remove --force` DROPS TABLES** when the migration is the only one applied. Use plain `remove` (no `--force`) to delete an unapplied migration file. (This is a global EF gotcha — see `memories/efcore.md`.) It rarely bites this project because we don't use migrations, but if you ever add one…
3. **`dotnet ef …` without a fresh `dotnet build`** yields `"No migrations were found in assembly"` because the new class isn't compiled in. Don't chain `--no-build`.
4. **CORS is locked to `http://localhost:4200`** in `Program.cs`. Change the origin if you serve the SPA from a different port.
5. **`Jwt:Key`** in `appsettings.json` must be ≥ 32 chars, or the app fails to boot. The default placeholder is exactly at the boundary.
6. **Assign endpoint rejects cross-department** — surface a nice error toast; the API returns `400 { "message": "Assignee is not in the same department as the ticket." }`.
7. **Ticket detail has no Delete button.** Delete is Admin-only and only exposed on the API. If you want a UI, add it to the detail component sidebar.

---

## 12. Troubleshooting quick table

| Symptom                                              | Likely cause / fix |
|------------------------------------------------------|--------------------|
| Login says "invalid credentials" right after seed    | `PasswordSeeder` didn't run — restart the API once so the hashed passwords replace `PLACEHOLDER_HASH`. |
| Swagger shows "Failed to fetch"                      | You enabled HTTPS redirection in Development. Turn it back off in `Program.cs`. |
| Request Type dropdown stays "Pick a department first" | You reintroduced the `FormControl.value` in `computed()` bug — see §11 point 1. |
| Notification bell never shows a badge                | You aren't polling (service not injected) or your token expired mid-session. Log out + back in. |
| `PendingModelChangesWarning` when running the API    | Someone added an EF migration by accident. Remove it, or align the model with the DB. |
| `sqlcmd` errors on setup script                      | LocalDB not running — `sqllocaldb start MSSQLLocalDB` then retry. |
| `ng serve` starts but the page 404s on refresh       | You built for prod without SPA fallback. In dev, `ng serve` handles it automatically. |

---

## 13. Roadmap (from the original README, still valid)

- [ ] Toast notifications, skeleton loaders, mobile-responsive sidebar, replace `confirm()` with a real dialog.
- [ ] Auto-assignment — round-robin an active employee in the ticket's department.
- [ ] Pagination + search on the Tickets list (API + UI).
- [ ] Tests — xUnit for a couple of controllers, Vitest specs for `AuthService` + `NotificationsService`.
- [ ] Deploy — Azure App Service (API) + Azure Static Web App (SPA), or a single VM.
- [ ] Refresh tokens (currently the JWT just expires after 8 h).
- [ ] Email / in-app push when a ticket is assigned or changes status (extend the polling notification service).
- [ ] Admin-visible Delete button on the ticket detail page.

---

## 14. Where to poke first when you come back

1. Skim §5 (Roles matrix) — reloads the mental model in 30 seconds.
2. Read §6.5 and §6.9 — the two features with the most non-obvious wiring.
3. Read §11 (Gotchas) before touching any reactive form or EF-related command.
4. `dotnet run` in `api/TicketFlow.Api`, `npx ng serve` in `web/ticketflow-web`, log in as `admin@ticketflow.local` / `Password@123`, and click around.

Good luck, future you.
