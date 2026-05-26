import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Department } from '../../models/department.model';
import { RequestType } from '../../models/request-type.model';
import { DepartmentsService } from '../../services/departments.service';
import { RequestTypesService } from '../../services/request-types.service';
import { toErrorMessage } from '../../services/http-error.util';

// Inline CRUD UI for Request Types. List + form on the same screen.
@Component({
  selector: 'app-request-types-panel',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LIST -->
      <section class="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold">Request Types</h2>
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ items().length }} active</span>
        </div>

        @if (loading()) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        } @else if (items().length === 0) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No request types yet. Create one →</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th class="px-5 py-2.5 text-left font-medium">Name</th>
                  <th class="px-5 py-2.5 text-left font-medium">Department</th>
                  <th class="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (rt of items(); track rt.requestTypeId) {
                  <tr [class.bg-indigo-50/40]="editingId() === rt.requestTypeId"
                      [class.dark:bg-indigo-500/5]="editingId() === rt.requestTypeId"
                      class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="px-5 py-3 font-medium">{{ rt.name }}</td>
                    <td class="px-5 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {{ rt.departmentName || departmentName(rt.departmentId) }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right space-x-2">
                      <button (click)="startEdit(rt)"
                              class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                        Edit
                      </button>
                      <button (click)="remove(rt)"
                              class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline focus-visible:ring-2 focus-visible:ring-rose-500 rounded">
                        Delete
                      </button>
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
          <h2 class="font-semibold">{{ editingId() ? 'Edit request type' : 'Add request type' }}</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="p-5 space-y-4">
          <div>
            <label for="departmentId" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <select id="departmentId" formControlName="departmentId"
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
            <label for="rtName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input id="rtName" type="text" formControlName="name"
                   class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   placeholder="e.g. Laptop Request" />
            @if (showError('name')) {
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Name is required (max 100 chars).</p>
            }
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
              <button type="button" (click)="cancelEdit()"
                      class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
            }
            <button type="submit" [disabled]="form.invalid || submitting()"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:hover:bg-indigo-600 text-white text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition-colors">
              @if (submitting()) {
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
                Saving…
              } @else {
                {{ editingId() ? 'Save changes' : 'Add request type' }}
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class RequestTypesPanelComponent implements OnInit {
  private readonly rtApi = inject(RequestTypesService);
  private readonly deptApi = inject(DepartmentsService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<RequestType[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly serverError = signal<string | null>(null);

  // Quick lookup map so we can render the department name even if the API row
  // didn't include it (e.g. after an edit).
  private readonly deptMap = computed(() => {
    const m = new Map<number, string>();
    for (const d of this.departments()) m.set(d.departmentId, d.name);
    return m;
  });

  readonly form = this.fb.nonNullable.group({
    departmentId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    name: ['', [Validators.required, Validators.maxLength(100)]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  departmentName(id: number): string {
    return this.deptMap().get(id) ?? '—';
  }

  load(): void {
    this.loading.set(true);
    // Load both lists in parallel so the table can show department names immediately.
    forkJoin({
      rts: this.rtApi.getAll(),
      depts: this.deptApi.getAll()
    }).subscribe({
      next: ({ rts, depts }) => {
        this.departments.set(depts);
        this.items.set(rts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  showError(name: 'departmentId' | 'name'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  startEdit(rt: RequestType): void {
    this.editingId.set(rt.requestTypeId);
    this.form.reset({
      departmentId: rt.departmentId,
      name: rt.name,
      isActive: rt.isActive
    });
    this.serverError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ departmentId: null, name: '', isActive: true });
    this.serverError.set(null);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const id = this.editingId();

    const finish = () => {
      this.submitting.set(false);
      this.cancelEdit();
      this.load();
    };
    const handleErr = (err: unknown) => {
      this.serverError.set(toErrorMessage(err, 'Save failed.'));
      this.submitting.set(false);
    };

    if (id == null) {
      this.rtApi.create({
        departmentId: v.departmentId!,
        name: v.name.trim()
      }).subscribe({ next: finish, error: handleErr });
    } else {
      this.rtApi.update(id, {
        departmentId: v.departmentId!,
        name: v.name.trim(),
        isActive: v.isActive
      }).subscribe({ next: finish, error: handleErr });
    }
  }

  remove(rt: RequestType): void {
    if (!confirm(`Delete request type "${rt.name}"? (Soft delete — it will be deactivated.)`)) return;
    this.rtApi.delete(rt.requestTypeId).subscribe({
      next: () => this.load(),
      error: (err: unknown) => this.serverError.set(toErrorMessage(err, 'Delete failed.'))
    });
  }
}
