namespace TicketFlow.Api.Dtos;

// Input for PUT /api/roles/{id}
public class RoleUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
