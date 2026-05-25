import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Department } from '../../models/department.model';
import { DepartmentsService } from '../../services/departments.service';

// Inline CRUD UI for Departments. List + form on the same screen.
@Component({
  selector: 'app-departments-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LIST -->
      <section class="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold">Departments</h2>
          <span class="text-xs text-slate-500 dark:text-slate-400">{{ items().length }} active</span>
        </div>

        @if (loading()) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        } @else if (items().length === 0) {
          <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No departments yet. Create one →</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th class="px-5 py-2.5 text-left font-medium">Name</th>
                  <th class="px-5 py-2.5 text-left font-medium">Description</th>
                  <th class="px-5 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (d of items(); track d.departmentId) {
                  <tr [class.bg-indigo-50/40]="editingId() === d.departmentId"
                      [class.dark:bg-indigo-500/5]="editingId() === d.departmentId"
                      class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="px-5 py-3 font-medium">{{ d.name }}</td>
                    <td class="px-5 py-3 text-slate-500 dark:text-slate-400">{{ d.description || '—' }}</td>
                    <td class="px-5 py-3 text-right space-x-2">
                      <button (click)="startEdit(d)"
                              class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                        Edit
                      </button>
                      <button (click)="remove(d)"
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
          <h2 class="font-semibold">{{ editingId() ? 'Edit department' : 'Add department' }}</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="p-5 space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input id="name" type="text" formControlName="name"
                   class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   placeholder="e.g. IT" />
            @if (showError('name')) {
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Name is required (max 100 chars).</p>
            }
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea id="description" rows="3" formControlName="description"
                      class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="Optional"></textarea>
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
                {{ editingId() ? 'Save changes' : 'Add department' }}
              }
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class DepartmentsPanelComponent implements OnInit {
  private readonly api = inject(DepartmentsService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  showError(name: 'name'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  startEdit(d: Department): void {
    this.editingId.set(d.departmentId);
    this.form.reset({
      name: d.name,
      description: d.description ?? '',
      isActive: d.isActive
    });
    this.serverError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', isActive: true });
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

    const handleErr = (err: any) => {
      this.serverError.set(err?.error?.message ?? 'Save failed.');
      this.submitting.set(false);
    };

    if (id == null) {
      this.api.create({
        name: v.name.trim(),
        description: v.description?.trim() || null
      }).subscribe({ next: finish, error: handleErr });
    } else {
      this.api.update(id, {
        name: v.name.trim(),
        description: v.description?.trim() || null,
        isActive: v.isActive
      }).subscribe({ next: finish, error: handleErr });
    }
  }

  remove(d: Department): void {
    if (!confirm(`Delete department "${d.name}"? (Soft delete — it will be deactivated.)`)) return;
    this.api.delete(d.departmentId).subscribe({
      next: () => this.load(),
      error: (err) => this.serverError.set(err?.error?.message ?? 'Delete failed.')
    });
  }
}
