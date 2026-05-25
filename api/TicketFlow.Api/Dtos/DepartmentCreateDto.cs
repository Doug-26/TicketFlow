namespace TicketFlow.Api.Dtos;

// Used by POST /api/departments
public class DepartmentCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
