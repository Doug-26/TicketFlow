import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Department } from '../../models/department.model';
import { RequestType } from '../../models/request-type.model';
import {
  FieldType,
  RequestTypeField
} from '../../models/request-type-field.model';
import { DepartmentsService } from '../../services/departments.service';
import { RequestTypesService } from '../../services/request-types.service';
import { RequestTypeFieldsService } from '../../services/request-type-fields.service';
import { TicketsService } from '../../services/tickets.service';
import { toErrorMessage } from '../../services/http-error.util';

// Default form value per field type. Wider than `unknown` because Angular
// FormControl needs a real value (or null) at construction time.
type DynamicFieldValue = string | number | boolean | null;

// "Raise ticket" form. The dynamic part adapts to the chosen RequestType.
@Component({
  selector: 'app-ticket-create',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-3xl mx-auto">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Raise a ticket</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Fill in the details and submit.</p>
        </div>
        <a routerLink="/tickets" class="text-sm text-slate-500 dark:text-slate-400 hover:underline">← Back to tickets</a>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-6 space-y-5">

        <!-- Department + Request type -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="dept" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <select id="dept" formControlName="departmentId"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option [ngValue]="null" disabled>Select…</option>
              @for (d of departments(); track d.departmentId) {
                <option [ngValue]="d.departmentId">{{ d.name }}</option>
              }
            </select>
          </div>

          <div>
            <label for="rt" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Request type</label>
            <select id="rt" formControlName="requestTypeId" [disabled]="filteredRequestTypes().length === 0"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60">
              <option [ngValue]="null" disabled>{{ filteredRequestTypes().length ? 'Select…' : 'Pick a department first' }}</option>
              @for (rt of filteredRequestTypes(); track rt.requestTypeId) {
                <option [ngValue]="rt.requestTypeId">{{ rt.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Title + Priority -->
        <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
          <div>
            <label for="title" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input id="title" type="text" formControlName="title"
                   class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   placeholder="Short summary" />
            @if (showError('title')) {
              <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">Title is required.</p>
            }
          </div>
          <div>
            <label for="prio" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
            <select id="prio" formControlName="priority"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label for="desc" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea id="desc" rows="3" formControlName="description"
                    class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Optional details"></textarea>
        </div>

        <!-- Dynamic fields -->
        @if (fields().length > 0) {
          <div class="rounded-lg ring-1 ring-slate-200 dark:ring-slate-800 p-4 space-y-4 bg-slate-50/60 dark:bg-slate-800/30">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Additional details</h3>

            <div [formGroup]="dynamicGroup" class="space-y-4">
              @for (f of fields(); track f.requestTypeFieldId) {
                <div>
                  <label [for]="'f_' + f.fieldName" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {{ f.fieldLabel }}
                    @if (f.isRequired) { <span class="text-rose-500">*</span> }
                  </label>

                  @switch (f.fieldType) {
                    @case ('text') {
                      <input [id]="'f_' + f.fieldName" type="text" [formControlName]="f.fieldName"
                             class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                    }
                    @case ('number') {
                      <input [id]="'f_' + f.fieldName" type="number" [formControlName]="f.fieldName"
                             class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                    }
                    @case ('date') {
                      <input [id]="'f_' + f.fieldName" type="date" [formControlName]="f.fieldName"
                             class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
                    }
                    @case ('select') {
                      <select [id]="'f_' + f.fieldName" [formControlName]="f.fieldName"
                              class="mt-2 block w-full rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                        <option [ngValue]="null" disabled>Select…</option>
                        @for (opt of optionsFor(f); track opt) {
                          <option [ngValue]="opt">{{ opt }}</option>
                        }
                      </select>
                    }
                    @case ('radio') {
                      <div class="mt-2 flex flex-wrap gap-3">
                        @for (opt of optionsFor(f); track opt) {
                          <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input type="radio" [value]="opt" [formControlName]="f.fieldName"
                                   class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"/>
                            {{ opt }}
                          </label>
                        }
                      </div>
                    }
                    @case ('checkbox') {
                      <label class="mt-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input type="checkbox" [formControlName]="f.fieldName"
                               class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/>
                        Yes
                      </label>
                    }
                  }

                  @if (showDynamicError(f.fieldName)) {
                    <p class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{{ f.fieldLabel }} is required.</p>
                  }
                </div>
              }
            </div>
          </div>
        } @else if (form.controls.requestTypeId.value && !loadingFields()) {
          <p class="text-xs text-slate-500 dark:text-slate-400">This request type has no extra fields.</p>
        }

        @if (serverError()) {
          <div class="rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
            {{ serverError() }}
          </div>
        }

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <a routerLink="/tickets" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</a>
          <button type="submit" [disabled]="form.invalid || submitting()"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
            @if (submitting()) {
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
              Submitting…
            } @else {
              Submit ticket
            }
          </button>
        </div>
      </form>
    </div>
  `
})
export class TicketCreateComponent implements OnInit {
  private readonly deptApi = inject(DepartmentsService);
  private readonly rtApi = inject(RequestTypesService);
  private readonly fieldsApi = inject(RequestTypeFieldsService);
  private readonly api = inject(TicketsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly departments = signal<Department[]>([]);
  readonly requestTypes = signal<RequestType[]>([]);
  readonly fields = signal<RequestTypeField[]>([]);
  readonly loadingFields = signal(false);
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  // Mirror of departmentId form control as a signal so `filteredRequestTypes`
  // (a computed) actually re-evaluates when the department changes.
  // FormControl.value is a plain property — reading it inside computed() does
  // NOT register a dependency, so we bridge via this signal in ngOnInit.
  private readonly selectedDepartmentId = signal<number | null>(null);

  // The main form. Dynamic answers live in a child FormGroup we rebuild on type change.
  readonly form = this.fb.nonNullable.group({
    departmentId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    requestTypeId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    priority: ['Medium'],
    fields: this.fb.group({})
  });

  get dynamicGroup(): FormGroup {
    return this.form.controls.fields;
  }

  // Filter request types to the chosen department.
  readonly filteredRequestTypes = computed(() => {
    const id = this.selectedDepartmentId();
    if (!id) return [];
    return this.requestTypes().filter((rt) => rt.departmentId === id && rt.isActive);
  });

  ngOnInit(): void {
    // Load departments + all request types up front. Fields are loaded on demand.
    this.deptApi.getAll().subscribe({ next: (d) => this.departments.set(d) });
    this.rtApi.getAll().subscribe({ next: (r) => this.requestTypes.set(r) });

    // When dept changes, reset request type and fields.
    this.form.controls.departmentId.valueChanges.subscribe((v) => {
      this.selectedDepartmentId.set(v);
      this.form.controls.requestTypeId.setValue(null);
      this.fields.set([]);
      this.rebuildDynamicGroup([]);
    });

    // When request type changes, load that type's fields.
    this.form.controls.requestTypeId.valueChanges.subscribe((id) => {
      if (!id) {
        this.fields.set([]);
        this.rebuildDynamicGroup([]);
        return;
      }
      this.loadingFields.set(true);
      this.fieldsApi.getByType(id).subscribe({
        next: (rows) => {
          this.fields.set(rows);
          this.rebuildDynamicGroup(rows);
          this.loadingFields.set(false);
        },
        error: () => this.loadingFields.set(false)
      });
    });
  }

  showError(name: 'title'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  showDynamicError(name: string): boolean {
    const c = this.dynamicGroup.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  // Parse FieldOptionsJson safely. Returns [] on bad/missing JSON.
  optionsFor(f: RequestTypeField): string[] {
    if (!f.fieldOptionsJson) return [];
    try {
      const parsed = JSON.parse(f.fieldOptionsJson);
      return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }

  // Replace the dynamic FormGroup with one control per field, with type-aware defaults.
  private rebuildDynamicGroup(fields: RequestTypeField[]): void {
    const group = this.fb.group({});
    for (const f of fields) {
      const validators = f.isRequired ? [Validators.required] : [];
      const initial = this.defaultFor(f.fieldType);
      group.addControl(f.fieldName, new FormControl(initial, validators));
    }
    this.form.setControl('fields', group);
  }

  private defaultFor(type: FieldType): DynamicFieldValue {
    if (type === 'checkbox') return false;
    return null; // text/number/select/radio/date start empty
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const fieldValues = JSON.stringify(v.fields);

    this.api.create({
      departmentId: v.departmentId!,
      requestTypeId: v.requestTypeId!,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      fieldValues: this.fields().length > 0 ? fieldValues : null,
      priority: v.priority
    }).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.router.navigate(['/tickets', created.ticketId]);
      },
      error: (err: unknown) => {
        this.serverError.set(toErrorMessage(err, 'Could not raise ticket.'));
        this.submitting.set(false);
      }
    });
  }
}
