import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  RequestType,
  RequestTypeCreate,
  RequestTypeUpdate
} from '../models/request-type.model';

@Injectable({ providedIn: 'root' })
export class RequestTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/requesttypes`;

  // The list endpoint joins departmentName for display.
  getAll(): Observable<RequestType[]> {
    return this.http.get<RequestType[]>(this.base);
  }

  getById(id: number): Observable<RequestType> {
    return this.http.get<RequestType>(`${this.base}/${id}`);
  }

  getByDepartment(departmentId: number): Observable<RequestType[]> {
    return this.http.get<RequestType[]>(`${this.base}/by-department/${departmentId}`);
  }

  create(body: RequestTypeCreate): Observable<RequestType> {
    return this.http.post<RequestType>(this.base, body);
  }

  update(id: number, body: RequestTypeUpdate): Observable<RequestType> {
    return this.http.put<RequestType>(`${this.base}/${id}`, body);
  }

  // API does a SOFT delete (sets IsActive=0).
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
