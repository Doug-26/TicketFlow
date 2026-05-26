import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { toErrorMessage } from '../../services/http-error.util';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors">

      <!-- Floating theme toggle -->
      <button (click)="theme.toggle()"
              class="absolute top-5 right-5 w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
        @if (theme.theme() === 'dark') {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m0-13.728l1.414 1.414m11.314 11.314l1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        } @else {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
        }
      </button>

      <div class="w-full max-w-md">
        <!-- Brand -->
        <div class="flex items-center justify-center gap-2 mb-8">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">T</div>
          <span class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">TicketFlow</span>
        </div>

        <!-- Card -->
        <div class="bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl shadow-xl p-8 transition-colors">
          <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to continue.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-5">

            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input #emailInput id="email" type="email" autocomplete="email" formControlName="email"
                     class="mt-2 block w-full rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     placeholder="you@company.com" />
              @if (showError('email')) {
                <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                  @if (form.controls.email.errors?.['required']) { Email is required. }
                  @else if (form.controls.email.errors?.['email']) { Enter a valid email address. }
                </p>
              }
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input id="password" type="password" autocomplete="current-password" formControlName="password"
                     class="mt-2 block w-full rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     placeholder="••••••••" />
              @if (showError('password')) {
                <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Password is required.</p>
              }
            </div>

            <!-- Server error -->
            @if (serverError()) {
              <div class="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
                {{ serverError() }}
              </div>
            }

            <!-- Submit -->
            <button type="submit"
                    [disabled]="form.invalid || submitting()"
                    class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:hover:bg-indigo-600 text-white font-medium px-4 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition-colors">
              @if (submitting()) {
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                Signing in…
              } @else {
                Sign in
              }
            </button>
          </form>

          <p class="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Seeded users: <code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">admin&#64;ticketflow.local</code> · password <code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Password&#64;123</code>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  // Autofocus the email field on mount.
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngAfterViewInit(): void {
    queueMicrotask(() => this.emailInput()?.nativeElement.focus());
  }

  // Show error only after the user has interacted with the field.
  showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    try {
      await this.auth.login(this.form.getRawValue());
      this.router.navigateByUrl('/dashboard');
    } catch (err: unknown) {
      this.serverError.set(toErrorMessage(err, 'Invalid email or password.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
