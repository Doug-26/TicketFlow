namespace TicketFlow.Api.Dtos;

// Input for PUT /api/tickets/{id}/assign  (Admin or department head)
public class TicketAssignDto
{
    public int AssignedToEmployeeId { get; set; }
}
