import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Role, RoleCreate, RoleUpdate } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/roles`;

  getAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.base);
  }

  getById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.base}/${id}`);
  }

  create(body: RoleCreate): Observable<Role> {
    return this.http.post<Role>(this.base, body);
  }

  update(id: number, body: RoleUpdate): Observable<Role> {
    return this.http.put<Role>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
