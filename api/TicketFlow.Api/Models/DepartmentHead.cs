namespace TicketFlow.Api.Models;

// Maps to dbo.DepartmentHeads
public class DepartmentHead
{
    public int DepartmentHeadId { get; set; }
    public int DepartmentId { get; set; }
    public int EmployeeId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Department? Department { get; set; }
    public Employee? Employee { get; set; }
}
