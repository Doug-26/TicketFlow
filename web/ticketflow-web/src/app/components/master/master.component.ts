import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { DepartmentsPanelComponent } from './departments-panel.component';
import { RequestTypesPanelComponent } from './request-types-panel.component';

type Tab = 'departments' | 'request-types';

// Master Data page with a segmented toggle:
//   /master                 -> Departments tab (default)
//   /master/departments     -> Departments tab
//   /master/request-types   -> Request Types tab
@Component({
  selector: 'app-master',
  standalone: true,
  imports: [DepartmentsPanelComponent, RequestTypesPanelComponent],
  templateUrl: './master.component.html'
})
export class MasterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tab = signal<Tab>('departments');

  ngOnInit(): void {
    // Restore the chosen tab from the URL when arriving via deep link / refresh.
    const param = this.route.snapshot.paramMap.get('tab');
    if (param === 'request-types') {
      this.tab.set('request-types');
    } else {
      this.tab.set('departments');
    }
  }

  setTab(t: Tab): void {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.router.navigate(['/master', t], { replaceUrl: true });
  }
}
