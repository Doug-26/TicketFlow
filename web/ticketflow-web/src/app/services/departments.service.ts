import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Department,
  DepartmentCreate,
  DepartmentUpdate
} from '../models/department.model';

// Thin wrapper around HttpClient. Components subscribe directly to these observables.
@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/departments`;

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.base);
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.base}/${id}`);
  }

  create(body: DepartmentCreate): Observable<Department> {
    return this.http.post<Department>(this.base, body);
  }

  update(id: number, body: DepartmentUpdate): Observable<Department> {
    return this.http.put<Department>(`${this.base}/${id}`, body);
  }

  // API does a SOFT delete (sets IsActive=0).
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
