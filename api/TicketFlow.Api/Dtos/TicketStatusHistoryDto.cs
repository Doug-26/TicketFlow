namespace TicketFlow.Api.Dtos;

// Shape returned by status-history endpoints.
public class TicketStatusHistoryDto
{
    public int HistoryId { get; set; }
    public int TicketId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public int ChangedByEmployeeId { get; set; }
    public string ChangedByEmployeeName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime ChangedAt { get; set; }
}
