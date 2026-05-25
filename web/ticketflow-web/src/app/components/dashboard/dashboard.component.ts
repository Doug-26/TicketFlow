import { Component, inject } from '@angular/core';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Welcome back, {{ auth.currentUser()?.fullName }}.</p>
      </header>

      <!-- Stat cards (placeholder values for now — wired up in Goal 5) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        @for (card of cards; track card.label) {
          <div class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-5 shadow-sm transition-colors">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ card.label }}</p>
              <span [class]="card.badgeClass" class="text-xs font-medium px-2 py-0.5 rounded-full">{{ card.tag }}</span>
            </div>
            <p class="mt-3 text-3xl font-semibold tracking-tight">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Updated just now</p>
          </div>
        }
      </div>

      <!-- Placeholder section -->
      <div class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-6 shadow-sm">
        <h2 class="font-semibold">Recent activity</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Ticket list and timeline will appear here in Goal 5.</p>
      </div>
    </div>
  `
})
export class DashboardComponent {
  readonly auth = inject(AuthService);

  // Placeholder stat cards — Goal 5 wires real numbers from the API.
  readonly cards = [
    { label: 'All tickets', value: 0, tag: 'Total',  badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' },
    { label: 'Open',        value: 0, tag: 'Active', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
    { label: 'Closed',      value: 0, tag: 'Done',   badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' }
  ];
}
