import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';

import { Employee } from '../../models/employee.model';
import { RequestTypeField } from '../../models/request-type-field.model';
import { Ticket } from '../../models/ticket.model';
import { TicketStatusHistoryEntry } from '../../models/ticket-status-history.model';
import { AuthService } from '../../services/auth.service';
import { EmployeesService } from '../../services/employees.service';
import { RequestTypeFieldsService } from '../../services/request-type-fields.service';
import { TicketStatusHistoryService } from '../../services/ticket-status-history.service';
import { TicketsService } from '../../services/tickets.service';
import { toErrorMessage } from '../../services/http-error.util';

const STATUSES = ['Open', 'InProgress', 'Closed'];

interface AnswerRow { label: string; value: string; }

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
    } @else if (!ticket()) {
      <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Ticket not found. <a routerLink="/tickets" class="text-indigo-600 hover:underline">Back to list</a>
      </div>
    } @else {
      <div class="space-y-6 max-w-5xl mx-auto">

        <!-- Header -->
        <header class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{{ ticket()!.ticketNumber }}</span>
              <span [class]="statusBadge(ticket()!.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ ticket()!.status }}</span>
              <span [class]="priorityBadge(ticket()!.priority)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ ticket()!.priority }}</span>
            </div>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight">{{ ticket()!.title }}</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ ticket()!.departmentName }} · {{ ticket()!.requestTypeName }} ·
              raised by {{ ticket()!.raisedByEmployeeName }} on {{ ticket()!.createdAt | date: 'medium' }}
            </p>
          </div>
          <a routerLink="/tickets" class="text-sm text-slate-500 dark:text-slate-400 hover:underline self-start">← All tickets</a>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- LEFT — content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Description -->
            @if (ticket()!.description) {
              <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
                <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</h2>
                <p class="mt-2 whitespace-pre-wrap text-sm">{{ ticket()!.description }}</p>
              </section>
            }

            <!-- Dynamic answers -->
            @if (answerRows().length > 0) {
              <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
                <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Details</h2>
                <dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (a of answerRows(); track a.label) {
                    <div>
                      <dt class="text-xs text-slate-500 dark:text-slate-400">{{ a.label }}</dt>
                      <dd class="text-sm font-medium">{{ a.value }}</dd>
                    </div>
                  }
                </dl>
              </section>
            }

            <!-- History timeline -->
            <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
              <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status timeline</h2>
              <ol class="mt-4 space-y-4">
                @for (h of history(); track h.historyId) {
                  <li class="flex gap-3">
                    <div class="flex flex-col items-center">
                      <div class="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                      <div class="w-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                    </div>
                    <div class="pb-4">
                      <p class="text-sm">
                        @if (h.oldStatus) {
                          <span class="text-slate-500 dark:text-slate-400">{{ h.oldStatus }}</span>
                          <span class="mx-1 text-slate-400">→</span>
                        }
                        <span class="font-medium">{{ h.newStatus }}</span>
                      </p>
                      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {{ h.changedByEmployeeName }} · {{ h.changedAt | date: 'medium' }}
                      </p>
                      @if (h.remarks) {
                        <p class="mt-1 text-xs text-slate-600 dark:text-slate-300 italic">"{{ h.remarks }}"</p>
                      }
                    </div>
                  </li>
                }
              </ol>
            </section>
          </div>

          <!-- RIGHT — actions -->
          <aside class="space-y-6">
            <!-- Meta card -->
            <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5 space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500 dark:text-slate-400">Assigned to</span>
                <span class="font-medium">{{ ticket()!.assignedToEmployeeName ?? 'Unassigned' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 dark:text-slate-400">Updated</span>
                <span>{{ ticket()!.updatedAt | date: 'short' }}</span>
              </div>
            </section>

            <!-- Status change -->
            @if (canChangeStatus()) {
              <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
                <h3 class="text-sm font-semibold">Change status</h3>
                <form [formGroup]="statusForm" (ngSubmit)="changeStatus()" class="mt-3 space-y-3">
                  <select formControlName="newStatus"
                          class="block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    @for (s of statuses; track s) {
                      <option [value]="s" [disabled]="s === ticket()!.status">{{ s }}</option>
                    }
                  </select>

                  <textarea formControlName="remarks" rows="2" placeholder="Optional remarks"
                            class="block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"></textarea>

                  <button type="submit" [disabled]="statusForm.invalid || changing()"
                          class="w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                    @if (changing()) { Updating… } @else { Update status }
                  </button>
                </form>
              </section>
            }

            <!-- Assign (Admin only) -->
            @if (auth.isAdmin()) {
              <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
                <h3 class="text-sm font-semibold">Assign ticket</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pick an active employee from {{ ticket()!.departmentName }}.</p>
                <form [formGroup]="assignForm" (ngSubmit)="assign()" class="mt-3 space-y-3">
                  <select formControlName="assignedToEmployeeId"
                          class="block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    <option [ngValue]="null" disabled>Select…</option>
                    @for (e of deptEmployees(); track e.employeeId) {
                      <option [ngValue]="e.employeeId">{{ e.fullName }} — {{ e.roleName }}</option>
                    }
                  </select>

                  <button type="submit" [disabled]="assignForm.invalid || assigning()"
                          class="w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                    @if (assigning()) { Assigning… } @else { Assign }
                  </button>
                </form>
              </section>
            }

            @if (actionError()) {
              <div class="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
                {{ actionError() }}
              </div>
            }
          </aside>
        </div>
      </div>
    }
  `
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsApi = inject(TicketsService);
  private readonly historyApi = inject(TicketStatusHistoryService);
  private readonly fieldsApi = inject(RequestTypeFieldsService);
  private readonly empApi = inject(EmployeesService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly statuses = STATUSES;

  readonly ticket = signal<Ticket | null>(null);
  readonly history = signal<TicketStatusHistoryEntry[]>([]);
  readonly fields = signal<RequestTypeField[]>([]);
  readonly deptEmployees = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly changing = signal(false);
  readonly assigning = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly statusForm = this.fb.nonNullable.group({
    newStatus: ['', Validators.required],
    remarks: ['']
  });

  readonly assignForm = this.fb.nonNullable.group({
    assignedToEmployeeId: this.fb.control<number | null>(null, { validators: [Validators.required] })
  });

  // Parsed dynamic answers as label/value rows (joins JSON values with field metadata).
  readonly answerRows = computed<AnswerRow[]>(() => {
    const t = this.ticket();
    if (!t?.fieldValues) return [];
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(t.fieldValues) || {}; } catch { return []; }

    const byName = new Map(this.fields().map((f) => [f.fieldName, f]));
    const rows: AnswerRow[] = [];
    for (const [key, raw] of Object.entries(parsed)) {
      const meta = byName.get(key);
      const label = meta?.fieldLabel ?? key;
      const value = this.formatAnswer(raw);
      if (value !== '') rows.push({ label, value });
    }
    return rows;
  });

  // Can the current user change status? Raiser, assignee, or Admin.
  readonly canChangeStatus = computed(() => {
    const t = this.ticket();
    const me = this.auth.currentUser();
    if (!t || !me) return false;
    if (this.auth.isAdmin()) return true;
    return t.raisedByEmployeeId === me.employeeId || t.assignedToEmployeeId === me.employeeId;
  });

  ngOnInit(): void {
    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!id) { this.loading.set(false); return; }
    this.loadAll(id);
  }

  loadAll(id: number): void {
    this.loading.set(true);
    forkJoin({
      ticket: this.ticketsApi.getById(id),
      history: this.historyApi.getByTicket(id)
    }).subscribe({
      next: ({ ticket, history }) => {
        this.ticket.set(ticket);
        this.history.set(history);
        this.statusForm.controls.newStatus.setValue(
          STATUSES.find((s) => s !== ticket.status) ?? ticket.status
        );

        // Field labels + (for Admins only) eligible assignees, loaded in parallel.
        // Always emit the same shape so downstream code can stay strictly typed.
        const emps$: Observable<Employee[]> = this.auth.isAdmin()
          ? this.empApi.getByDepartment(ticket.departmentId)
          : of([]);

        forkJoin({
          fields: this.fieldsApi.getByType(ticket.requestTypeId),
          emps: emps$
        }).subscribe({
          next: (res) => {
            this.fields.set(res.fields);
            this.deptEmployees.set(res.emps);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  changeStatus(): void {
    const t = this.ticket();
    if (!t || this.statusForm.invalid || this.changing()) return;
    this.changing.set(true);
    this.actionError.set(null);

    const v = this.statusForm.getRawValue();
    this.ticketsApi.changeStatus(t.ticketId, {
      newStatus: v.newStatus,
      remarks: v.remarks?.trim() || null
    }).subscribe({
      next: () => {
        this.changing.set(false);
        this.statusForm.controls.remarks.setValue('');
        this.loadAll(t.ticketId);
      },
      error: (err: unknown) => {
        this.actionError.set(toErrorMessage(err, 'Could not change status.'));
        this.changing.set(false);
      }
    });
  }

  assign(): void {
    const t = this.ticket();
    if (!t || this.assignForm.invalid || this.assigning()) return;
    this.assigning.set(true);
    this.actionError.set(null);

    this.ticketsApi.assign(t.ticketId, {
      assignedToEmployeeId: this.assignForm.controls.assignedToEmployeeId.value!
    }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.assignForm.reset({ assignedToEmployeeId: null });
        this.loadAll(t.ticketId);
      },
      error: (err: unknown) => {
        this.actionError.set(toErrorMessage(err, 'Could not assign.'));
        this.assigning.set(false);
      }
    });
  }

  // ---- helpers ----
  private formatAnswer(raw: unknown): string {
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    return String(raw);
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
