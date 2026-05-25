using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// Manages who is the head of which department.
// Any logged-in user can READ heads. Only Admin can change them.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/departmentheads
public class DepartmentHeadsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public DepartmentHeadsController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/departmentheads  -> all CURRENT (active) heads
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.DepartmentHeads
            .Include(h => h.Department)
            .Include(h => h.Employee)
            .Where(h => h.IsActive)
            .OrderBy(h => h.Department!.Name)
            .ToListAsync();

        // Project to a small anonymous shape (avoids cycles when serialising navs).
        return Ok(list.Select(h => new
        {
            h.DepartmentHeadId,
            h.DepartmentId,
            DepartmentName = h.Department?.Name,
            h.EmployeeId,
            EmployeeName = h.Employee?.FullName,
            h.IsActive,
            h.CreatedAt
        }));
    }

    // GET /api/departmentheads/by-department/5  -> active head for one department (or 404)
    [HttpGet("by-department/{departmentId:int}")]
    public async Task<IActionResult> GetByDepartment(int departmentId)
    {
        var head = await _db.DepartmentHeads
            .Include(h => h.Employee)
            .FirstOrDefaultAsync(h => h.DepartmentId == departmentId && h.IsActive);

        if (head == null) return NotFound();

        return Ok(new
        {
            head.DepartmentHeadId,
            head.DepartmentId,
            head.EmployeeId,
            EmployeeName = head.Employee?.FullName,
            head.IsActive,
            head.CreatedAt
        });
    }

    // POST /api/departmentheads  (Admin only)
    // Setting a new active head deactivates any existing active head for that department.
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] DepartmentHeadCreateDto dto)
    {
        // 1. Validate the dept and employee exist.
        var deptExists = await _db.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
        if (!deptExists) return BadRequest(new { message = "Department not found." });

        var emp = await _db.Employees.FirstOrDefaultAsync(e => e.EmployeeId == dto.EmployeeId);
        if (emp == null) return BadRequest(new { message = "Employee not found." });

        // 2. Deactivate the current active head (if any) for that department.
        //    The filtered unique index would reject two actives anyway, but we do
        //    it explicitly so the API doesn't return a constraint error.
        var currentActives = await _db.DepartmentHeads
            .Where(h => h.DepartmentId == dto.DepartmentId && h.IsActive)
            .ToListAsync();

        foreach (var h in currentActives)
        {
            h.IsActive = false;
        }

        // 3. Insert the new active head.
        var newHead = new DepartmentHead
        {
            DepartmentId = dto.DepartmentId,
            EmployeeId = dto.EmployeeId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.DepartmentHeads.Add(newHead);

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByDepartment), new { departmentId = newHead.DepartmentId }, new
        {
            newHead.DepartmentHeadId,
            newHead.DepartmentId,
            newHead.EmployeeId,
            newHead.IsActive,
            newHead.CreatedAt
        });
    }

    // DELETE /api/departmentheads/5  (Admin only) — deactivate a head record.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var head = await _db.DepartmentHeads.FindAsync(id);
        if (head == null) return NotFound();

        head.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
