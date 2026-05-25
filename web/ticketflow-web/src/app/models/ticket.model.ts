// What GET /api/tickets returns (TicketListItemDto on the API side).
export interface Ticket {
  ticketId: number;
  ticketNumber: string;
  title: string;
  description: string | null;
  fieldValues: string | null;        // JSON string of dynamic answers
  priority: string;                  // Low | Medium | High
  status: string;                    // Open | InProgress | Closed
  createdAt: string;
  updatedAt: string;

  raisedByEmployeeId: number;
  raisedByEmployeeName: string;

  departmentId: number;
  departmentName: string;

  requestTypeId: number;
  requestTypeName: string;

  assignedToEmployeeId: number | null;
  assignedToEmployeeName: string | null;
}

// POST /api/tickets
export interface TicketCreate {
  departmentId: number;
  requestTypeId: number;
  title: string;
  description: string | null;
  fieldValues: string | null;        // JSON.stringify of the dynamic answers
  priority: string;
}

// PUT /api/tickets/{id}/assign
export interface TicketAssign {
  assignedToEmployeeId: number;
}

// PUT /api/tickets/{id}/status
export interface TicketStatusUpdate {
  newStatus: string;
  remarks: string | null;
}
