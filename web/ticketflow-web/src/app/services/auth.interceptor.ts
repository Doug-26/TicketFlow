import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { TOKEN_KEY } from '../constants/app.constants';
import { AuthService } from './auth.service';

// Functional interceptor (Angular 21 style).
// - If we have a token, attach it as Bearer.
// - If the API returns 401, force a logout so the user is sent back to /login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const auth = inject(AuthService);

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
