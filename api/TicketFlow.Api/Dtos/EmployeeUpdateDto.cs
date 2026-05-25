namespace TicketFlow.Api.Dtos;

// Input for PUT /api/employees/{id}
// Password is optional — leave it null to keep the current one.
public class EmployeeUpdateDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public int RoleId { get; set; }
    public int? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
}
