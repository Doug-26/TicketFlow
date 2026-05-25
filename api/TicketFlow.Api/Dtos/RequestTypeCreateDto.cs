namespace TicketFlow.Api.Dtos;

// Input for POST /api/requesttypes
public class RequestTypeCreateDto
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
}
