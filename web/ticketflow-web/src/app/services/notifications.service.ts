import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Subscription, interval, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Ticket } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { TicketsService } from './tickets.service';

// How often to re-check "tickets assigned to me" (ms).
const POLL_MS = 30_000;

// localStorage key prefix — one entry per employee so different users on the
// same browser don't share their "already-seen" list.
const SEEN_KEY_PREFIX = 'ticketflow.notifs.seen.';

/**
 * Watches for tickets assigned to the current user and exposes:
 *  - `assigned`     : every ticket currently assigned to me
 *  - `unseen`       : the subset the user has not yet acknowledged
 *  - `unseenCount`  : convenience count for the header badge
 *
 * Polling starts automatically after login and stops on logout, driven by
 * a signal `effect()` on `AuthService.currentUser()`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly auth = inject(AuthService);
  private readonly ticketsApi = inject(TicketsService);

  readonly assigned = signal<Ticket[]>([]);
  private readonly seenIds = signal<ReadonlySet<number>>(new Set());

  readonly unseen = computed(() => {
    const seen = this.seenIds();
    return this.assigned().filter((t) => !seen.has(t.ticketId));
  });
  readonly unseenCount = computed(() => this.unseen().length);

  private sub: Subscription | null = null;

  constructor() {
    // Start polling when the user logs in, stop when they log out.
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadSeen(user.employeeId);
        this.start();
      } else {
        this.stop();
        this.assigned.set([]);
        this.seenIds.set(new Set());
      }
    });
  }

  /** Force an immediate refresh (e.g. after the user assigns a ticket). */
  refresh(): void {
    this.ticketsApi.getAll({ assigned: true }).subscribe({
      next: (rows) => this.applyRows(rows)
    });
  }

  /** Mark every currently-assigned ticket as seen. */
  markAllSeen(): void {
    this.seenIds.set(new Set(this.assigned().map((t) => t.ticketId)));
    this.persistSeen();
  }

  /** Mark a single ticket as seen (called when the user clicks a notification). */
  markSeen(ticketId: number): void {
    const next = new Set(this.seenIds());
    next.add(ticketId);
    this.seenIds.set(next);
    this.persistSeen();
  }

  // --------------------- internals ---------------------

  private start(): void {
    this.stop();
    this.sub = interval(POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.ticketsApi.getAll({ assigned: true }))
      )
      .subscribe({
        next: (rows) => this.applyRows(rows),
        // Poll errors (e.g. token expired) are silently ignored — the
        // interceptor / auth guard will handle the real redirect.
        error: () => { /* ignore */ }
      });
  }

  private stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  private applyRows(rows: Ticket[]): void {
    this.assigned.set(rows);

    // Prune the seen set so it only contains still-assigned ticket IDs.
    const current = new Set(rows.map((t) => t.ticketId));
    const seen = this.seenIds();
    let changed = false;
    const trimmed = new Set<number>();
    for (const id of seen) {
      if (current.has(id)) trimmed.add(id);
      else changed = true;
    }
    if (changed) {
      this.seenIds.set(trimmed);
      this.persistSeen();
    }
  }

  private loadSeen(employeeId: number): void {
    try {
      const raw = localStorage.getItem(`${SEEN_KEY_PREFIX}${employeeId}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const ids = arr
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n));
          this.seenIds.set(new Set(ids));
          return;
        }
      }
    } catch {
      /* fall through to empty set */
    }
    this.seenIds.set(new Set());
  }

  private persistSeen(): void {
    const id = this.auth.currentUser()?.employeeId;
    if (!id) return;
    try {
      localStorage.setItem(
        `${SEEN_KEY_PREFIX}${id}`,
        JSON.stringify([...this.seenIds()])
      );
    } catch {
      /* localStorage full / disabled — ignore */
    }
  }
}
