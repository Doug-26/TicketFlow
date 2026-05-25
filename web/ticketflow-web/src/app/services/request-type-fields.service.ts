import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  RequestTypeField,
  RequestTypeFieldCreate,
  RequestTypeFieldUpdate
} from '../models/request-type-field.model';

@Injectable({ providedIn: 'root' })
export class RequestTypeFieldsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/requesttypefields`;

  getByType(requestTypeId: number): Observable<RequestTypeField[]> {
    return this.http.get<RequestTypeField[]>(`${this.base}/by-type/${requestTypeId}`);
  }

  getById(id: number): Observable<RequestTypeField> {
    return this.http.get<RequestTypeField>(`${this.base}/${id}`);
  }

  create(body: RequestTypeFieldCreate): Observable<RequestTypeField> {
    return this.http.post<RequestTypeField>(this.base, body);
  }

  update(id: number, body: RequestTypeFieldUpdate): Observable<RequestTypeField> {
    return this.http.put<RequestTypeField>(`${this.base}/${id}`, body);
  }

  // Hard delete here — the API does a physical delete (no FK references).
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
