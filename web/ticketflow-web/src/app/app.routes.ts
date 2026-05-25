import { Routes } from '@angular/router';

import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role.guard';
import { ROLES } from './constants/app.constants';

// All lazy-loaded so the bundle stays small.
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then((m) => m.LoginComponent)
  },
  {
    // Authenticated shell — wraps the rest of the app.
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },

      // Tickets (any logged-in user)
      {
        path: 'tickets',
        loadComponent: () =>
          import('./components/tickets/tickets-list.component').then(
            (m) => m.TicketsListComponent
          )
      },
      {
        path: 'tickets/new',
        loadComponent: () =>
          import('./components/tickets/ticket-create.component').then(
            (m) => m.TicketCreateComponent
          )
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('./components/tickets/ticket-detail.component').then(
            (m) => m.TicketDetailComponent
          )
      },

      // Employees (HR or Admin)
      {
        path: 'employees',
        canActivate: [roleGuard([ROLES.HR, ROLES.Admin])],
        loadComponent: () =>
          import('./components/employees/employees.component').then(
            (m) => m.EmployeesComponent
          )
      },

      // Master data (Admin only)
      {
        path: 'master',
        canActivate: [roleGuard([ROLES.Admin])],
        loadComponent: () =>
          import('./components/master/master.component').then((m) => m.MasterComponent)
      },
      {
        path: 'master/:tab',
        canActivate: [roleGuard([ROLES.Admin])],
        loadComponent: () =>
          import('./components/master/master.component').then((m) => m.MasterComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
