namespace TicketFlow.Api.Dtos;

// Shape returned by ticket list/detail endpoints.
public class TicketListItemDto
{
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FieldValues { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public int RaisedByEmployeeId { get; set; }
    public string RaisedByEmployeeName { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public int RequestTypeId { get; set; }
    public string RequestTypeName { get; set; } = string.Empty;

    public int? AssignedToEmployeeId { get; set; }
    public string? AssignedToEmployeeName { get; set; }
}
