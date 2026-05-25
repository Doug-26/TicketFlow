import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DepartmentHead, DepartmentHeadCreate } from '../models/department-head.model';

@Injectable({ providedIn: 'root' })
export class DepartmentHeadsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/departmentheads`;

  // All CURRENT (active) heads.
  getAll(): Observable<DepartmentHead[]> {
    return this.http.get<DepartmentHead[]>(this.base);
  }

  getByDepartment(departmentId: number): Observable<DepartmentHead> {
    return this.http.get<DepartmentHead>(`${this.base}/by-department/${departmentId}`);
  }

  // Setting a new active head auto-deactivates the previous one (API does this).
  create(body: DepartmentHeadCreate): Observable<DepartmentHead> {
    return this.http.post<DepartmentHead>(this.base, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
