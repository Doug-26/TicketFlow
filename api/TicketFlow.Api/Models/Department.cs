namespace TicketFlow.Api.Models;

// Maps to dbo.Departments
public class Department
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
