using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// The main module: raise tickets, list/get them, assign them, change status.
// Status changes are auto-logged into TicketStatusHistory.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/tickets
public class TicketsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public TicketsController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/tickets
    // Optional query params: ?status=Open  ?mine=true  ?assigned=true
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] bool mine = false,
        [FromQuery] bool assigned = false)
    {
        var query = _db.Tickets
            .Include(t => t.RaisedByEmployee)
            .Include(t => t.Department)
            .Include(t => t.RequestType)
            .Include(t => t.AssignedToEmployee)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(t => t.Status == status);
        }

        var currentEmployeeId = GetCurrentEmployeeId();
        if (mine && currentEmployeeId.HasValue)
        {
            query = query.Where(t => t.RaisedByEmployeeId == currentEmployeeId.Value);
        }
        if (assigned && currentEmployeeId.HasValue)
        {
            query = query.Where(t => t.AssignedToEmployeeId == currentEmployeeId.Value);
        }

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => MapToDto(t))
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/tickets/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ticket = await _db.Tickets
            .Include(t => t.RaisedByEmployee)
            .Include(t => t.Department)
            .Include(t => t.RequestType)
            .Include(t => t.AssignedToEmployee)
            .FirstOrDefaultAsync(t => t.TicketId == id);

        if (ticket == null) return NotFound();
        return Ok(MapToDto(ticket));
    }

    // POST /api/tickets  -> raise a new ticket
    // RaisedByEmployeeId is taken from the JWT (the logged-in employee).
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TicketCreateDto dto)
    {
        var currentEmployeeId = GetCurrentEmployeeId();
        if (currentEmployeeId == null)
        {
            return Unauthorized(new { message = "Could not determine the current employee from the token." });
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        // Cross-check Department and RequestType (RequestType must belong to that Department).
        var deptExists = await _db.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
        if (!deptExists) return BadRequest(new { message = "Department not found." });

        var rt = await _db.RequestTypes.FirstOrDefaultAsync(r => r.RequestTypeId == dto.RequestTypeId);
        if (rt == null) return BadRequest(new { message = "RequestType not found." });
        if (rt.DepartmentId != dto.DepartmentId)
        {
            return BadRequest(new { message = "RequestType does not belong to the given Department." });
        }

        var now = DateTime.UtcNow;

        var ticket = new Ticket
        {
            // TicketNumber needs the TicketId, which we only know after the first save.
            // Use a temporary unique placeholder so the UNIQUE constraint is satisfied.
            TicketNumber = $"TMP-{Guid.NewGuid():N}".Substring(0, 30),
            RaisedByEmployeeId = currentEmployeeId.Value,
            DepartmentId = dto.DepartmentId,
            RequestTypeId = dto.RequestTypeId,
            AssignedToEmployeeId = null,   // manual assignment later
            Title = dto.Title.Trim(),
            Description = dto.Description,
            FieldValues = dto.FieldValues,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
            Status = "Open",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();   // <-- ticket.TicketId is now assigned by SQL

        // Real human-friendly number: TKT-2026-00001
        ticket.TicketNumber = $"TKT-{now.Year}-{ticket.TicketId:D5}";

        // Initial status-history row (OldStatus = null -> NewStatus = Open).
        _db.TicketStatusHistory.Add(new TicketStatusHistory
        {
            TicketId = ticket.TicketId,
            OldStatus = null,
            NewStatus = "Open",
            ChangedByEmployeeId = currentEmployeeId.Value,
            Remarks = "Ticket created.",
            ChangedAt = now
        });

        await _db.SaveChangesAsync();

        // Re-load navs for the response.
        await _db.Entry(ticket).Reference(t => t.RaisedByEmployee).LoadAsync();
        await _db.Entry(ticket).Reference(t => t.Department).LoadAsync();
        await _db.Entry(ticket).Reference(t => t.RequestType).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = ticket.TicketId }, MapToDto(ticket));
    }

    // PUT /api/tickets/5/assign  (Admin only)
    [HttpPut("{id:int}/assign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Assign(int id, [FromBody] TicketAssignDto dto)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();

        var assignee = await _db.Employees.FirstOrDefaultAsync(e => e.EmployeeId == dto.AssignedToEmployeeId);
        if (assignee == null) return BadRequest(new { message = "Assignee employee not found." });

        // (Optional but useful) assignee should be in the ticket's department.
        if (assignee.DepartmentId != ticket.DepartmentId)
        {
            return BadRequest(new
            {
                message = "Assignee is not in the same department as the ticket."
            });
        }

        ticket.AssignedToEmployeeId = dto.AssignedToEmployeeId;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT /api/tickets/5/status  -> change status, auto-writes a history row.
    // Allowed: Admin, the raiser, or the current assignee.
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> ChangeStatus(int id, [FromBody] TicketStatusUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewStatus))
        {
            return BadRequest(new { message = "NewStatus is required." });
        }

        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();

        var currentEmployeeId = GetCurrentEmployeeId();
        var isAdmin = User.IsInRole("Admin");
        var isRaiser = currentEmployeeId.HasValue && ticket.RaisedByEmployeeId == currentEmployeeId.Value;
        var isAssignee = currentEmployeeId.HasValue && ticket.AssignedToEmployeeId == currentEmployeeId.Value;

        if (!(isAdmin || isRaiser || isAssignee))
        {
            return Forbid();
        }

        if (ticket.Status == dto.NewStatus)
        {
            return BadRequest(new { message = "Ticket is already in that status." });
        }

        var now = DateTime.UtcNow;
        var oldStatus = ticket.Status;

        ticket.Status = dto.NewStatus.Trim();
        ticket.UpdatedAt = now;

        _db.TicketStatusHistory.Add(new TicketStatusHistory
        {
            TicketId = ticket.TicketId,
            OldStatus = oldStatus,
            NewStatus = ticket.Status,
            ChangedByEmployeeId = currentEmployeeId ?? ticket.RaisedByEmployeeId,
            Remarks = dto.Remarks,
            ChangedAt = now
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/tickets/5  (Admin only) — hard delete + cascade history.
    // We physically delete because tickets aren't referenced from elsewhere.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();

        // Remove history rows first (FK NO ACTION on delete in the DB).
        var history = _db.TicketStatusHistory.Where(h => h.TicketId == id);
        _db.TicketStatusHistory.RemoveRange(history);

        _db.Tickets.Remove(ticket);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- helpers ----

    // Pulls the employeeId claim out of the JWT (set by JwtTokenService.Create).
    private int? GetCurrentEmployeeId()
    {
        var raw = User.FindFirst("employeeId")?.Value;
        return int.TryParse(raw, out var id) ? id : null;
    }

    private static TicketListItemDto MapToDto(Ticket t) => new()
    {
        TicketId = t.TicketId,
        TicketNumber = t.TicketNumber,
        Title = t.Title,
        Description = t.Description,
        FieldValues = t.FieldValues,
        Priority = t.Priority,
        Status = t.Status,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,

        RaisedByEmployeeId = t.RaisedByEmployeeId,
        RaisedByEmployeeName = t.RaisedByEmployee?.FullName ?? string.Empty,

        DepartmentId = t.DepartmentId,
        DepartmentName = t.Department?.Name ?? string.Empty,

        RequestTypeId = t.RequestTypeId,
        RequestTypeName = t.RequestType?.Name ?? string.Empty,

        AssignedToEmployeeId = t.AssignedToEmployeeId,
        AssignedToEmployeeName = t.AssignedToEmployee?.FullName
    };
}
