import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { ROLES, RoleName, TOKEN_KEY, USER_KEY } from '../constants/app.constants';
import { CurrentUser, LoginRequest, LoginResponse } from '../models/auth.model';

// Single source of truth for "who is logged in".
// - Token lives in localStorage (so it survives refresh).
// - currentUser is a signal so the UI reacts immediately on login/logout.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Read initial state from localStorage so a refresh keeps you logged in.
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<CurrentUser | null>(this.readStoredUser());

  /** The raw JWT string, or null when logged out. */
  readonly token = this._token.asReadonly();
  /** The logged-in user's info (everything except the token). */
  readonly currentUser = this._user.asReadonly();
  /** Convenience: true when a token exists. */
  readonly isLoggedIn = computed(() => this._token() !== null);
  /** Convenience: true when the logged-in user is an Admin. */
  readonly isAdmin = computed(() => this._user()?.role === ROLES.Admin);

  /** POST /api/auth/login — stores token + user, then resolves. */
  async login(req: LoginRequest): Promise<LoginResponse> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, req)
    );

    localStorage.setItem(TOKEN_KEY, res.token);
    const user: CurrentUser = {
      employeeId: res.employeeId,
      fullName: res.fullName,
      role: res.role,
      departmentId: res.departmentId
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    this._token.set(res.token);
    this._user.set(user);

    return res;
  }

  /** Clears token + user and bounces to /login. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigateByUrl('/login');
  }

  /** Does the current user have one of the given roles? */
  hasRole(allowed: RoleName[]): boolean {
    const role = this._user()?.role;
    return !!role && allowed.includes(role);
  }

  // Safe JSON parse from localStorage. Bad/missing data -> null.
  private readStoredUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}
