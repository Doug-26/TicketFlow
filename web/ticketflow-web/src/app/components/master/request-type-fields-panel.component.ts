import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RequestType } from '../../models/request-type.model';
import {
  FIELD_TYPES,
  FieldType,
  RequestTypeField
} from '../../models/request-type-field.model';
import { RequestTypesService } from '../../services/request-types.service';
import { RequestTypeFieldsService } from '../../services/request-type-fields.service';

// Admin tab: define the dynamic fields that a Request Type asks for.
// Pick a request type first (top dropdown), then manage its fields below.
@Component({
  selector: 'app-request-type-fields-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="space-y-6">

      <!-- TYPE PICKER -->
      <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-5">
        <label for="rtfPick" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Choose a Request Type</label>
        <select id="rtfPick" [value]="selectedTypeId() ?? ''" (change)="pickType($event)"
                class="mt-2 block w-full max-w-md rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
          <option value="" disabled>Select…</option>
          @for (rt of types(); track rt.requestTypeId) {
            <option [value]="rt.requestTypeId">{{ rt.name }} <span>({{ rt.departmentName }})</span></option>
          }
        </select>
        @if (!selectedTypeId()) {
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Pick a request type to see its fields.</p>
        }
      </section>

      @if (selectedTypeId()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- FIELD LIST -->
          <section class="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
            <div class="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <h2 class="font-semibold">Fields</h2>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ fields().length }} total</span>
            </div>

            @if (loadingFields()) {
              <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            } @else if (fields().length === 0) {
              <div class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No fields yet. Add one →</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                    <tr>
                      <th class="px-5 py-2.5 text-left font-medium">Label</th>
                      <th class="px-5 py-2.5 text-left font-medium">Key</th>
                      <th class="px-5 py-2.5 text-left font-medium">Type</th>
                      <th class="px-5 py-2.5 text-center font-medium">Required</th>
                      <th class="px-5 py-2.5 text-center font-medium">Order</th>
                      <th class="px-5 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                    @for (f of fields(); track f.requestTypeFieldId) {
                      <tr [class.bg-indigo-50/40]="editingId() === f.requestTypeFieldId"
                          [class.dark:bg-indigo-500/5]="editingId() === f.requestTypeFieldId"
                          class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="px-5 py-3 font-medium">{{ f.fieldLabel }}</td>
                        <td class="px-5 py-3 text-slate-500 dark:text-slate-400"><code class="text-xs">{{ f.fieldName }}</code></td>
                        <td class="px-5 py-3">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{{ f.fieldType }}</span>
                        </td>
                        <td class="px-5 py-3 text-center">{{ f.isRequired ? 'Yes' : '—' }}</td>
                        <td class="px-5 py-3 text-center text-slate-500 dark:text-slate-400">{{ f.displayOrder }}</td>
                        <td class="px-5 py-3 text-right space-x-2">
                          <button (click)="startEdit(f)" class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                          <button (click)="remove(f)" class="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <!-- FIELD FORM -->
          <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 class="font-semibold">{{ editingId() ? 'Edit field' : 'Add field' }}</h2>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" class="p-5 space-y-4">
              <div>
                <label for="fLabel" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Label</label>
                <input id="fLabel" type="text" formControlName="fieldLabel"
                       class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                       placeholder="e.g. RAM" />
                @if (showError('fieldLabel')) {
                  <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Label is required.</p>
                }
              </div>

              <div>
                <label for="fName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Key (used in JSON)</label>
                <input id="fName" type="text" formControlName="fieldName"
                       class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all"
                       placeholder="e.g. ram" />
                @if (showError('fieldName')) {
                  <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Key is required (no spaces — camelCase recommended).</p>
                }
              </div>

              <div>
                <label for="fType" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select id="fType" formControlName="fieldType"
                        class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  @for (t of fieldTypes; track t) { <option [value]="t">{{ t }}</option> }
                </select>
              </div>

              @if (needsOptions()) {
                <div>
                  <label for="fOpts" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Options (comma-separated)</label>
                  <input id="fOpts" type="text" formControlName="optionsCsv"
                         class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         placeholder="e.g. 8GB, 16GB, 32GB" />
                  <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Saved as a JSON array of strings.</p>
                </div>
              }

              <div class="grid grid-cols-2 gap-3">
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" formControlName="isRequired" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/>
                  <span class="text-slate-700 dark:text-slate-300">Required</span>
                </label>

                <div>
                  <label for="fOrder" class="block text-xs font-medium text-slate-500 dark:text-slate-400">Order</label>
                  <input id="fOrder" type="number" min="0" formControlName="displayOrder"
                         class="mt-1 block w-full rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                </div>
              </div>

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
                  @if (submitting()) { Saving… } @else { {{ editingId() ? 'Save changes' : 'Add field' }} }
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `
})
export class RequestTypeFieldsPanelComponent implements OnInit {
  private readonly typesApi = inject(RequestTypesService);
  private readonly fieldsApi = inject(RequestTypeFieldsService);
  private readonly fb = inject(FormBuilder);

  readonly fieldTypes = FIELD_TYPES;
  readonly types = signal<RequestType[]>([]);
  readonly selectedTypeId = signal<number | null>(null);
  readonly fields = signal<RequestTypeField[]>([]);
  readonly loadingFields = signal(false);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fieldLabel: ['', [Validators.required, Validators.maxLength(200)]],
    fieldName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^\S+$/)]],
    fieldType: ['text' as FieldType],
    optionsCsv: [''],
    isRequired: [false],
    displayOrder: [0]
  });

  // 'select' and 'radio' need an options list. Other types ignore it.
  readonly needsOptions = computed(() => {
    const t = this.form.controls.fieldType.value;
    return t === 'select' || t === 'radio';
  });

  ngOnInit(): void {
    this.typesApi.getAll().subscribe({
      next: (list) => this.types.set(list)
    });
  }

  pickType(e: Event): void {
    const id = +(e.target as HTMLSelectElement).value;
    if (!id) return;
    this.selectedTypeId.set(id);
    this.cancelEdit();
    this.loadFields();
  }

  loadFields(): void {
    const id = this.selectedTypeId();
    if (!id) return;
    this.loadingFields.set(true);
    this.fieldsApi.getByType(id).subscribe({
      next: (rows) => { this.fields.set(rows); this.loadingFields.set(false); },
      error: () => this.loadingFields.set(false)
    });
  }

  showError(name: 'fieldLabel' | 'fieldName'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  startEdit(f: RequestTypeField): void {
    this.editingId.set(f.requestTypeFieldId);
    let csv = '';
    try {
      const parsed = f.fieldOptionsJson ? JSON.parse(f.fieldOptionsJson) : null;
      if (Array.isArray(parsed)) csv = parsed.join(', ');
    } catch { /* ignore bad JSON */ }

    this.form.reset({
      fieldLabel: f.fieldLabel,
      fieldName: f.fieldName,
      fieldType: f.fieldType,
      optionsCsv: csv,
      isRequired: f.isRequired,
      displayOrder: f.displayOrder
    });
    this.serverError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      fieldLabel: '', fieldName: '', fieldType: 'text', optionsCsv: '',
      isRequired: false, displayOrder: 0
    });
    this.serverError.set(null);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    const typeId = this.selectedTypeId();
    if (!typeId) return;

    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const optionsJson = this.needsOptions() && v.optionsCsv?.trim()
      ? JSON.stringify(v.optionsCsv.split(',').map((s) => s.trim()).filter(Boolean))
      : null;

    const payload = {
      fieldLabel: v.fieldLabel.trim(),
      fieldName: v.fieldName.trim(),
      fieldType: v.fieldType,
      fieldOptionsJson: optionsJson,
      isRequired: v.isRequired,
      displayOrder: v.displayOrder
    };
    const id = this.editingId();
    const finish = () => { this.submitting.set(false); this.cancelEdit(); this.loadFields(); };
    const handleErr = (err: any) => { this.serverError.set(err?.error?.message ?? 'Save failed.'); this.submitting.set(false); };

    if (id == null) {
      this.fieldsApi.create({ ...payload, requestTypeId: typeId }).subscribe({ next: finish, error: handleErr });
    } else {
      this.fieldsApi.update(id, payload).subscribe({ next: finish, error: handleErr });
    }
  }

  remove(f: RequestTypeField): void {
    if (!confirm(`Delete field "${f.fieldLabel}"? This cannot be undone.`)) return;
    this.fieldsApi.delete(f.requestTypeFieldId).subscribe({
      next: () => this.loadFields(),
      error: (err) => this.serverError.set(err?.error?.message ?? 'Delete failed.')
    });
  }
}
