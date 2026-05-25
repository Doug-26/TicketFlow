namespace TicketFlow.Api.Models;

// Maps to dbo.RequestTypes
public class RequestType
{
    public int RequestTypeId { get; set; }
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Department? Department { get; set; }
}
