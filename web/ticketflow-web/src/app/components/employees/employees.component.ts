import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Department } from '../../models/department.model';
import { Employee } from '../../models/employee.model';
import { Role } from '../../models/role.model';
import { DepartmentsService } from '../../services/departments.service';
import { EmployeesService } from '../../services/employees.service';
import { RolesService } from '../../services/roles.service';
import { toErrorMessage } from '../../services/http-error.util';

// HR/Admin top-level page: list + inline create/edit form for employees.
@Component({
  selector: 'app-employees',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Employees</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Create, edit, and deactivate employees.</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- LIST -->
        <section class="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
          <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <h2 class="font-semibold">Active employees</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ items().length }}</span>
          </div>

          @if (loading()) {
            <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          } @else if (items().length === 0) {
            <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No employees yet.</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                  <tr>
                    <th class="px-5 py-2.5 text-left font-medium">Name</th>
                    <th class="px-5 py-2.5 text-left font-medium">Email</th>
                    <th class="px-5 py-2.5 text-left font-medium">Role</th>
                    <th class="px-5 py-2.5 text-left font-medium">Department</th>
                    <th class="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                  @for (e of items(); track e.employeeId) {
                    <tr [class.bg-indigo-50/40]="editingId() === e.employeeId"
                        [class.dark:bg-indigo-500/5]="editingId() === e.employeeId"
                        class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="px-5 py-3 font-medium">{{ e.fullName }}</td>
                      <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ e.email }}</td>
                      <td class="px-5 py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{{ e.roleName }}</span>
                      </td>
                      <td class="px-5 py-3">{{ e.departmentName ?? '—' }}</td>
                      <td class="px-5 py-3 text-right space-x-2">
                        <button (click)="startEdit(e)" class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                        <button (click)="remove(e)" class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Deactivate</button>
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
            <h2 class="font-semibold">{{ editingId() ? 'Edit employee' : 'Add employee' }}</h2>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="p-5 space-y-4">
            <div>
              <label for="empName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
              <input id="empName" type="text" formControlName="fullName"
                     class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     placeholder="Jane Doe" />
              @if (showError('fullName')) {
                <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Full name is required.</p>
              }
            </div>

            <div>
              <label for="empEmail" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input id="empEmail" type="email" formControlName="email"
                     class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     placeholder="jane@company.com" />
              @if (showError('email')) {
                <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Valid email is required.</p>
              }
            </div>

            <div>
              <label for="empPwd" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password {{ editingId() ? '(leave blank to keep)' : '' }}
              </label>
              <input id="empPwd" type="password" formControlName="password" autocomplete="new-password"
                     class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                     [attr.placeholder]="editingId() ? '••••••••' : 'At least 6 characters'" />
              @if (showError('password')) {
                <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Password must be at least 6 characters.</p>
              }
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="empRole" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select id="empRole" formControlName="roleId"
                        class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option [ngValue]="null" disabled>Select…</option>
                  @for (r of roles(); track r.roleId) {
                    <option [ngValue]="r.roleId">{{ r.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="empDept" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                <select id="empDept" formControlName="departmentId"
                        class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option [ngValue]="null">— None —</option>
                  @for (d of departments(); track d.departmentId) {
                    <option [ngValue]="d.departmentId">{{ d.name }}</option>
                  }
                </select>
              </div>
            </div>

            @if (editingId()) {
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" formControlName="isActive" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/>
                <span class="text-slate-700 dark:text-slate-300">Active</span>
              </label>
            }

            @if (serverError()) {
              <div class="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
                {{ serverError() }}
              </div>
            }

            <div class="flex items-center justify-end gap-2 pt-2">
              @if (editingId()) {
                <button type="button" (click)="cancelEdit()" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              }
              <button type="submit" [disabled]="form.invalid || submitting()"
                      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                @if (submitting()) {
                  <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                  Saving…
                } @else {
                  {{ editingId() ? 'Save changes' : 'Add employee' }}
                }
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `
})
export class EmployeesComponent implements OnInit {
  private readonly empApi = inject(EmployeesService);
  private readonly deptApi = inject(DepartmentsService);
  private readonly rolesApi = inject(RolesService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    roleId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    departmentId: this.fb.control<number | null>(null),
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  showError(name: 'fullName' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    if (name === 'password') {
      // Only invalid when something was typed and it's too short, OR creating and empty.
      if (this.editingId()) {
        return c.invalid && (c.dirty || c.touched) && !!c.value;
      }
      return c.invalid || !c.value;
    }
    return c.invalid && (c.dirty || c.touched);
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      emps: this.empApi.getAll(),
      depts: this.deptApi.getAll(),
      roles: this.rolesApi.getAll()
    }).subscribe({
      next: ({ emps, depts, roles }) => {
        this.items.set(emps);
        this.departments.set(depts);
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  startEdit(e: Employee): void {
    this.editingId.set(e.employeeId);
    this.form.reset({
      fullName: e.fullName,
      email: e.email,
      password: '',
      roleId: e.roleId,
      departmentId: e.departmentId,
      isActive: e.isActive
    });
    // Password optional in edit mode.
    this.form.controls.password.setValidators([Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.serverError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      fullName: '', email: '', password: '', roleId: null, departmentId: null, isActive: true
    });
    // Password required in create mode.
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.serverError.set(null);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const id = this.editingId();
    const finish = () => { this.submitting.set(false); this.cancelEdit(); this.load(); };
    const handleErr = (err: unknown) => { this.serverError.set(toErrorMessage(err, 'Save failed.')); this.submitting.set(false); };

    if (id == null) {
      this.empApi.create({
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        password: v.password,
        roleId: v.roleId!,
        departmentId: v.departmentId
      }).subscribe({ next: finish, error: handleErr });
    } else {
      this.empApi.update(id, {
        fullName: v.fullName.trim(),
        email: v.email.trim(),
        password: v.password ? v.password : null,
        roleId: v.roleId!,
        departmentId: v.departmentId,
        isActive: v.isActive
      }).subscribe({ next: finish, error: handleErr });
    }
  }

  remove(e: Employee): void {
    if (!confirm(`Deactivate ${e.fullName}?`)) return;
    this.empApi.delete(e.employeeId).subscribe({
      next: () => this.load(),
      error: (err: unknown) => this.serverError.set(toErrorMessage(err, 'Deactivate failed.'))
    });
  }
}
