using System.ComponentModel.DataAnnotations;

namespace TicketFlow.Api.Models;

// Maps to dbo.TicketStatusHistory.
// NOTE: EF Core's convention looks for "Id" or "TicketStatusHistoryId" as the PK.
// Our column is "HistoryId", so we tell EF explicitly with [Key].
public class TicketStatusHistory
{
    [Key]
    public int HistoryId { get; set; }
    public int TicketId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public int ChangedByEmployeeId { get; set; }
    public string? Remarks { get; set; }
    public DateTime ChangedAt { get; set; }

    public Ticket? Ticket { get; set; }
    public Employee? ChangedByEmployee { get; set; }
}
