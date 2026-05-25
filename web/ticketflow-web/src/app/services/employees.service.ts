import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Employee, EmployeeCreate, EmployeeUpdate } from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/employees`;

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.base);
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.base}/${id}`);
  }

  getByDepartment(departmentId: number): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.base}/by-department/${departmentId}`);
  }

  create(body: EmployeeCreate): Observable<Employee> {
    return this.http.post<Employee>(this.base, body);
  }

  update(id: number, body: EmployeeUpdate): Observable<Employee> {
    return this.http.put<Employee>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
