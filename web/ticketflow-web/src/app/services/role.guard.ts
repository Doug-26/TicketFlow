import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RoleName } from '../constants/app.constants';
import { AuthService } from './auth.service';

// Factory: build a CanActivateFn that allows access only to the given roles.
// Usage in a route: canActivate: [roleGuard(['Admin'])]
export function roleGuard(allowed: RoleName[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }
    if (auth.hasRole(allowed)) {
      return true;
    }
    // Logged in but wrong role -> send to dashboard (not back to login).
    return router.parseUrl('/dashboard');
  };
}
