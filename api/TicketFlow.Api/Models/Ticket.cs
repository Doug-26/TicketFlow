namespace TicketFlow.Api.Models;

// Maps to dbo.Tickets
public class Ticket
{
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;   // e.g. TKT-2026-00001 (API generates this)
    public int RaisedByEmployeeId { get; set; }
    public int DepartmentId { get; set; }
    public int RequestTypeId { get; set; }
    public int? AssignedToEmployeeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FieldValues { get; set; }                   // JSON object of dynamic answers
    public string Priority { get; set; } = "Medium";           // Low, Medium, High
    public string Status { get; set; } = "Open";               // Open, InProgress, Closed
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Employee? RaisedByEmployee { get; set; }
    public Department? Department { get; set; }
    public RequestType? RequestType { get; set; }
    public Employee? AssignedToEmployee { get; set; }
}
