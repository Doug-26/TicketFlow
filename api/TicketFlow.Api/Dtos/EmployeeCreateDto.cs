namespace TicketFlow.Api.Dtos;

// Input for POST /api/employees  (HR/Admin only)
public class EmployeeCreateDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;  // plain — controller hashes it
    public int RoleId { get; set; }
    public int? DepartmentId { get; set; }
}
