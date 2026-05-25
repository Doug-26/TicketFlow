namespace TicketFlow.Api.Dtos;

// Used by PUT /api/departments/{id}
public class DepartmentUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
