namespace TicketFlow.Api.Dtos;

// Input for POST /api/tickets
// RaisedByEmployeeId is taken from the JWT, not the body.
public class TicketCreateDto
{
    public int DepartmentId { get; set; }
    public int RequestTypeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FieldValues { get; set; }      // JSON string of dynamic answers
    public string Priority { get; set; } = "Medium";
}
