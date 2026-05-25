namespace TicketFlow.Api.Models;

// Maps to dbo.Employees
public class Employee
{
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public int? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    // Navigation properties (EF will populate these when you use .Include(...))
    public Role? Role { get; set; }
    public Department? Department { get; set; }
}
