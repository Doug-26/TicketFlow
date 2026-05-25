namespace TicketFlow.Api.Dtos;

// Input for PUT /api/tickets/{id}/status
public class TicketStatusUpdateDto
{
    public string NewStatus { get; set; } = string.Empty;   // Open, InProgress, Closed
    public string? Remarks { get; set; }
}
