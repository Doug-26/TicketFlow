import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Ticket } from '../../models/ticket.model';
import { AuthService } from '../../services/auth.service';
import { TicketsService } from '../../services/tickets.service';

interface StatCard {
  label: string;
  value: number;
  tag: string;
  badgeClass: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <header class="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Welcome back, {{ auth.currentUser()?.fullName }}.</p>
        </div>
        <a routerLink="/tickets/new"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Raise ticket
        </a>
      </header>

      <!-- Stat cards (real counts from the API) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (card of cards(); track card.label) {
          <div class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-5 shadow-sm transition-colors">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ card.label }}</p>
              <span [class]="card.badgeClass" class="text-xs font-medium px-2 py-0.5 rounded-full">{{ card.tag }}</span>
            </div>
            <p class="mt-3 text-3xl font-semibold tracking-tight">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
              @if (loading()) { Loading… } @else { Updated just now }
            </p>
          </div>
        }
      </div>

      <!-- Recent tickets -->
      <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
        <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold">Recent tickets</h2>
          <a routerLink="/tickets" class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View all →</a>
        </div>
        @if (loading()) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        } @else if (recent().length === 0) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No tickets yet.</div>
        } @else {
          <ul class="divide-y divide-slate-200 dark:divide-slate-800">
            @for (t of recent(); track t.ticketId) {
              <li>
                <a [routerLink]="['/tickets', t.ticketId]"
                   class="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div class="min-w-0">
                    <p class="font-medium truncate">{{ t.title }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      <span class="font-mono">{{ t.ticketNumber }}</span> · {{ t.departmentName }} · {{ t.requestTypeName }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span [class]="statusBadge(t.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ t.status }}</span>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ t.createdAt | date: 'short' }}</p>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly ticketsApi = inject(TicketsService);

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);

  // Top 5 most recent.
  readonly recent = computed(() => this.tickets().slice(0, 5));

  // Count by status, derived from the loaded list.
  readonly cards = computed<StatCard[]>(() => {
    const all = this.tickets();
    const open = all.filter((t) => t.status === 'Open').length;
    const inProgress = all.filter((t) => t.status === 'InProgress').length;
    const closed = all.filter((t) => t.status === 'Closed').length;
    return [
      { label: 'All tickets', value: all.length,  tag: 'Total',    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' },
      { label: 'Open',        value: open,        tag: 'Active',   badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
      { label: 'In progress', value: inProgress,  tag: 'Working',  badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' },
      { label: 'Closed',      value: closed,      tag: 'Done',     badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' }
    ];
  });

  ngOnInit(): void {
    // MVP: pull all tickets once and count client-side.
    // API already sorts newest-first.
    this.ticketsApi.getAll().subscribe({
      next: (rows) => { this.tickets.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Open':       return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
      case 'InProgress': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300';
      case 'Closed':     return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
      default:           return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
