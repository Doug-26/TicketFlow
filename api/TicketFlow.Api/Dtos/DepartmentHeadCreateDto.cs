namespace TicketFlow.Api.Dtos;

// Input for POST /api/departmentheads
// Setting a head deactivates any current active head for the department.
public class DepartmentHeadCreateDto
{
    public int DepartmentId { get; set; }
    public int EmployeeId { get; set; }
}
