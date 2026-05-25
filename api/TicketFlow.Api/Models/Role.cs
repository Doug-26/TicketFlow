namespace TicketFlow.Api.Models;

// Maps to dbo.Roles
public class Role
{
    public int RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}
