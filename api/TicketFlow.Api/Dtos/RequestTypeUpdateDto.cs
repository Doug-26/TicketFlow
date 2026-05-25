namespace TicketFlow.Api.Dtos;

// Input for PUT /api/requesttypes/{id}
public class RequestTypeUpdateDto
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
