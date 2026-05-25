namespace TicketFlow.Api.Dtos;

// What /api/auth/login returns on success
public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
}
