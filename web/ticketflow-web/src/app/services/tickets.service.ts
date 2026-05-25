import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Ticket,
  TicketAssign,
  TicketCreate,
  TicketStatusUpdate
} from '../models/ticket.model';

export interface TicketQuery {
  status?: string;     // 'Open' | 'InProgress' | 'Closed'
  mine?: boolean;      // tickets I raised
  assigned?: boolean;  // tickets assigned to me
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/tickets`;

  getAll(q: TicketQuery = {}): Observable<Ticket[]> {
    let params = new HttpParams();
    if (q.status) params = params.set('status', q.status);
    if (q.mine) params = params.set('mine', 'true');
    if (q.assigned) params = params.set('assigned', 'true');

    return this.http.get<Ticket[]>(this.base, { params });
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.base}/${id}`);
  }

  create(body: TicketCreate): Observable<Ticket> {
    return this.http.post<Ticket>(this.base, body);
  }

  assign(id: number, body: TicketAssign): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/assign`, body);
  }

  changeStatus(id: number, body: TicketStatusUpdate): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/status`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
