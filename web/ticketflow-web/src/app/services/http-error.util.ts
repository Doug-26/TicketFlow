import { HttpErrorResponse } from '@angular/common/http';

// Pulls a human-readable message out of an HttpErrorResponse (or any unknown).
// API errors come back as { message: string } in the body.
export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string } | null;
    if (body?.message) return body.message;
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    if (err.status === 403) return 'You do not have permission to do that.';
  }
  return fallback;
}
