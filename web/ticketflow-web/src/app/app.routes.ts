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
      {
        path: 'master',
        canActivate: [roleGuard([ROLES.Admin])],
        loadComponent: () =>
          import('./components/master/master.component').then((m) => m.MasterComponent)
      },
      {
        // The toggle inside MasterComponent navigates to /master/:tab.
        path: 'master/:tab',
        canActivate: [roleGuard([ROLES.Admin])],
        loadComponent: () =>
          import('./components/master/master.component').then((m) => m.MasterComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
