// Maps to TicketStatusHistoryDto.
export interface TicketStatusHistoryEntry {
  historyId: number;
  ticketId: number;
  oldStatus: string | null;
  newStatus: string;
  changedByEmployeeId: number;
  changedByEmployeeName: string;
  remarks: string | null;
  changedAt: string;
}
