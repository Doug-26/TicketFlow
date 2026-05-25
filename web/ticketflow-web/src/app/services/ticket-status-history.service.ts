import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { TicketStatusHistoryEntry } from '../models/ticket-status-history.model';

@Injectable({ providedIn: 'root' })
export class TicketStatusHistoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ticketstatushistory`;

  getByTicket(ticketId: number): Observable<TicketStatusHistoryEntry[]> {
    return this.http.get<TicketStatusHistoryEntry[]>(`${this.base}/by-ticket/${ticketId}`);
  }
}
