import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { NotificationsService } from '../../services/notifications.service';

// Bell icon + red badge + dropdown of "tickets assigned to me" notifications.
// Meant to sit in the topbar of the authenticated shell.
@Component({
  selector: 'app-notifications-bell',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" data-notif-root>
      <button type="button" (click)="toggle()"
              class="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 transition-colors"
              [attr.aria-label]="ariaLabel()"
              [attr.aria-expanded]="open()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>

        @if (notifs.unseenCount() > 0) {
          <span class="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none ring-2 ring-white dark:ring-slate-900">
            {{ badgeLabel() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="absolute right-0 mt-2 w-80 max-h-104 overflow-hidden rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-lg z-50 flex flex-col">
          <div class="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div>
              <p class="text-sm font-semibold">Assigned to you</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ notifs.unseenCount() }} new · {{ notifs.assigned().length }} total
              </p>
            </div>
            @if (notifs.unseenCount() > 0) {
              <button type="button" (click)="markAll()"
                      class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                Mark all read
              </button>
            }
          </div>

          <div class="overflow-y-auto">
            @if (notifs.assigned().length === 0) {
              <div class="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No tickets assigned to you yet.
              </div>
            } @else {
              <ul class="divide-y divide-slate-200 dark:divide-slate-800">
                @for (t of notifs.assigned(); track t.ticketId) {
                  <li>
                    <button type="button" (click)="openTicket(t.ticketId)"
                            class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            [class.bg-indigo-50/60]="isUnseen(t.ticketId)"
                            [class.dark:bg-indigo-500/10]="isUnseen(t.ticketId)">
                      <span class="mt-1 w-2 h-2 rounded-full shrink-0"
                            [class.bg-indigo-500]="isUnseen(t.ticketId)"
                            [class.bg-transparent]="!isUnseen(t.ticketId)"></span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium truncate">{{ t.title }}</span>
                        <span class="block text-xs text-slate-500 dark:text-slate-400 truncate">
                          {{ t.ticketNumber }} · {{ t.departmentName }} · {{ t.status }}
                        </span>
                        <span class="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {{ t.updatedAt | date: 'short' }}
                        </span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationsBellComponent {
  readonly notifs = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  isUnseen(ticketId: number): boolean {
    return this.notifs.unseen().some((t) => t.ticketId === ticketId);
  }

  badgeLabel(): string {
    const n = this.notifs.unseenCount();
    return n > 9 ? '9+' : String(n);
  }

  ariaLabel(): string {
    const n = this.notifs.unseenCount();
    return n === 0 ? 'Notifications' : `Notifications, ${n} new`;
  }

  markAll(): void {
    this.notifs.markAllSeen();
  }

  openTicket(ticketId: number): void {
    this.notifs.markSeen(ticketId);
    this.close();
    this.router.navigate(['/tickets', ticketId]);
  }

  // Close the dropdown on any click outside of it.
  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (!this.open()) return;
    const el = target as Node | null;
    if (!el || !this.host.nativeElement.contains(el)) {
      this.close();
    }
  }

  // Close on Escape.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
