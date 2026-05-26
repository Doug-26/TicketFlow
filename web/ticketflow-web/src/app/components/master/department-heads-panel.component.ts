import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Department } from '../../models/department.model';
import { Employee } from '../../models/employee.model';
import { DepartmentHead } from '../../models/department-head.model';
import { DepartmentsService } from '../../services/departments.service';
import { EmployeesService } from '../../services/employees.service';
import { DepartmentHeadsService } from '../../services/department-heads.service';
import { toErrorMessage } from '../../services/http-error.util';

// Admin-only panel: assign the active head of each department.
@Component({
  selector: 'app-department-heads-panel',
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LIST -->
      <section class="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold">Department Heads</h2>
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ heads().length }} active</span>
        </div>

        @if (loading()) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        } @else if (heads().length === 0) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No heads assigned yet. Pick one →</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th class="px-5 py-2.5 text-left font-medium">Department</th>
                  <th class="px-5 py-2.5 text-left font-medium">Head</th>
                  <th class="px-5 py-2.5 text-left font-medium">Since</th>
                  <th class="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (h of heads(); track h.departmentHeadId) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="px-5 py-3 font-medium">{{ h.departmentName || departmentName(h.departmentId) }}</td>
                    <td class="px-5 py-3">{{ h.employeeName || employeeName(h.employeeId) }}</td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ h.createdAt | date: 'mediumDate' }}</td>
                    <td class="px-5 py-3 text-right">
                      <button (click)="remove(h)" class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Remove</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- FORM -->
      <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
        <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold">Assign head</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Replaces the current active head for the department.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="p-5 space-y-4">
          <div>
            <label for="dh-dept" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <select id="dh-dept" formControlName="departmentId"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option [ngValue]="null" disabled>Select department…</option>
              @for (d of departments(); track d.departmentId) {
                <option [ngValue]="d.departmentId">{{ d.name }}</option>
              }
            </select>
            @if (showError('departmentId')) {
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Department is required.</p>
            }
          </div>

          <div>
            <label for="dh-emp" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Employee</label>
            <select id="dh-emp" formControlName="employeeId"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option [ngValue]="null" disabled>Select employee…</option>
              @for (e of eligibleEmployees(); track e.employeeId) {
                <option [ngValue]="e.employeeId">{{ e.fullName }} — {{ e.roleName }}</option>
              }
            </select>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Shows active employees in the selected department.</p>
            @if (showError('employeeId')) {
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Employee is required.</p>
            }
          </div>

          @if (serverError()) {
            <div class="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
              {{ serverError() }}
            </div>
          }

          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="submit" [disabled]="form.invalid || submitting()"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
              @if (submitting()) {
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                Assigning…
              } @else {
                Assign as head
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class DepartmentHeadsPanelComponent implements OnInit {
  private readonly api = inject(DepartmentHeadsService);
  private readonly deptApi = inject(DepartmentsService);
  private readonly empApi = inject(EmployeesService);
  private readonly fb = inject(FormBuilder);

  readonly heads = signal<DepartmentHead[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    departmentId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    employeeId: this.fb.control<number | null>(null, { validators: [Validators.required] })
  });

  // Re-filter employees whenever the selected department changes.
  readonly eligibleEmployees = computed(() => {
    const deptId = this.form.controls.departmentId.value;
    if (!deptId) return [];
    return this.employees().filter((e) => e.departmentId === deptId && e.isActive);
  });

  private readonly deptMap = computed(() => {
    const m = new Map<number, string>();
    for (const d of this.departments()) m.set(d.departmentId, d.name);
    return m;
  });
  private readonly empMap = computed(() => {
    const m = new Map<number, string>();
    for (const e of this.employees()) m.set(e.employeeId, e.fullName);
    return m;
  });

  ngOnInit(): void {
    this.load();
    // Reset employee selection whenever department changes.
    this.form.controls.departmentId.valueChanges.subscribe(() =>
      this.form.controls.employeeId.setValue(null)
    );
  }

  departmentName(id: number): string { return this.deptMap().get(id) ?? '—'; }
  employeeName(id: number): string { return this.empMap().get(id) ?? '—'; }

  showError(name: 'departmentId' | 'employeeId'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      heads: this.api.getAll(),
      depts: this.deptApi.getAll(),
      emps: this.empApi.getAll()
    }).subscribe({
      next: ({ heads, depts, emps }) => {
        this.heads.set(heads);
        this.departments.set(depts);
        this.employees.set(emps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    this.api.create({ departmentId: v.departmentId!, employeeId: v.employeeId! }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset({ departmentId: null, employeeId: null });
        this.load();
      },
      error: (err: unknown) => {
        this.serverError.set(toErrorMessage(err, 'Assign failed.'));
        this.submitting.set(false);
      }
    });
  }

  remove(h: DepartmentHead): void {
    const name = h.departmentName || this.departmentName(h.departmentId);
    if (!confirm(`Remove the head from "${name}"?`)) return;
    this.api.delete(h.departmentHeadId).subscribe({
      next: () => this.load(),
      error: (err: unknown) => this.serverError.set(toErrorMessage(err, 'Remove failed.'))
    });
  }
}
