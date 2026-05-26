import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { DepartmentsPanelComponent } from './departments-panel.component';
import { RequestTypesPanelComponent } from './request-types-panel.component';
import { RequestTypeFieldsPanelComponent } from './request-type-fields-panel.component';
import { RolesPanelComponent } from './roles-panel.component';
import { DepartmentHeadsPanelComponent } from './department-heads-panel.component';

type Tab = 'departments' | 'request-types' | 'fields' | 'roles' | 'heads';

const VALID_TABS: Tab[] = ['departments', 'request-types', 'fields', 'roles', 'heads'];

interface TabDef { id: Tab; label: string; }

@Component({
  selector: 'app-master',
  imports: [
    DepartmentsPanelComponent,
    RequestTypesPanelComponent,
    RequestTypeFieldsPanelComponent,
    RolesPanelComponent,
    DepartmentHeadsPanelComponent
  ],
  templateUrl: './master.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs: TabDef[] = [
    { id: 'departments',   label: 'Departments' },
    { id: 'request-types', label: 'Request Types' },
    { id: 'fields',        label: 'Request Type Fields' },
    { id: 'roles',         label: 'Roles' },
    { id: 'heads',         label: 'Department Heads' }
  ];

  readonly tab = signal<Tab>('departments');

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('tab') as Tab | null;
    this.tab.set(param && VALID_TABS.includes(param) ? param : 'departments');
  }

  setTab(t: Tab): void {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.router.navigate(['/master', t], { replaceUrl: true });
  }
}
