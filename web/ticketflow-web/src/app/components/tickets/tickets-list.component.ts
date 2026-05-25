import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Ticket } from '../../models/ticket.model';
import { AuthService } from '../../services/auth.service';
import { TicketsService, TicketQuery } from '../../services/tickets.service';

type Scope = 'all' | 'mine' | 'assigned';
type StatusFilter = '' | 'Open' | 'InProgress' | 'Closed';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Browse, filter, and raise tickets.</p>
        </div>
        <a routerLink="/tickets/new"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Raise ticket
        </a>
      </header>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <!-- Scope -->
        <nav role="tablist" class="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
          @for (s of scopes; track s.id) {
            <button (click)="setScope(s.id)"
                    [class.bg-white]="scope() === s.id"
                    [class.dark:bg-slate-900]="scope() === s.id"
                    [class.shadow-sm]="scope() === s.id"
                    [class.text-slate-900]="scope() === s.id"
                    [class.dark:text-slate-100]="scope() === s.id"
                    class="whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
              {{ s.label }}
            </button>
          }
        </nav>

        <!-- Status -->
        <select [value]="status()" (change)="setStatus($event)"
                class="rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="InProgress">In progress</option>
          <option value="Closed">Closed</option>
        </select>

        <span class="text-xs text-slate-500 dark:text-slate-400 md:ml-auto">{{ items().length }} result(s)</span>
      </div>

      <!-- Table -->
      <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        @if (loading()) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        } @else if (items().length === 0) {
          <div class="p-10 text-center">
            <p class="text-sm text-slate-500 dark:text-slate-400">No tickets match your filters.</p>
            <a routerLink="/tickets/new" class="mt-2 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Raise the first one →</a>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th class="px-5 py-2.5 text-left font-medium">Number</th>
                  <th class="px-5 py-2.5 text-left font-medium">Title</th>
                  <th class="px-5 py-2.5 text-left font-medium">Dept · Type</th>
                  <th class="px-5 py-2.5 text-left font-medium">Status</th>
                  <th class="px-5 py-2.5 text-left font-medium">Priority</th>
                  <th class="px-5 py-2.5 text-left font-medium">Assigned</th>
                  <th class="px-5 py-2.5 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (t of items(); track t.ticketId) {
                  <tr [routerLink]="['/tickets', t.ticketId]"
                      class="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                    <td class="px-5 py-3 font-mono text-xs">{{ t.ticketNumber }}</td>
                    <td class="px-5 py-3 font-medium">{{ t.title }}</td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ t.departmentName }} · {{ t.requestTypeName }}</td>
                    <td class="px-5 py-3">
                      <span [class]="statusBadge(t.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ t.status }}</span>
                    </td>
                    <td class="px-5 py-3">
                      <span [class]="priorityBadge(t.priority)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ t.priority }}</span>
                    </td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ t.assignedToEmployeeName ?? 'Unassigned' }}</td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ t.createdAt | date: 'medium' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `
})
export class TicketsListComponent implements OnInit {
  private readonly api = inject(TicketsService);
  readonly auth = inject(AuthService);

  readonly scopes: { id: Scope; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'My tickets' },
    { id: 'assigned', label: 'Assigned to me' }
  ];

  readonly scope = signal<Scope>('all');
  readonly status = signal<StatusFilter>('');
  readonly items = signal<Ticket[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void { this.load(); }

  setScope(s: Scope): void {
    if (this.scope() === s) return;
    this.scope.set(s);
    this.load();
  }

  setStatus(e: Event): void {
    this.status.set((e.target as HTMLSelectElement).value as StatusFilter);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const q: TicketQuery = {};
    if (this.scope() === 'mine') q.mine = true;
    if (this.scope() === 'assigned') q.assigned = true;
    if (this.status()) q.status = this.status();

    this.api.getAll(q).subscribe({
      next: (rows) => { this.items.set(rows); this.loading.set(false); },
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

  priorityBadge(p: string): string {
    switch (p) {
      case 'High':   return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
      case 'Medium': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'Low':    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
      default:       return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
