using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// RequestTypes = the kinds of requests each department can receive
// (e.g. "Laptop Request", "Mouse Request" under IT).
// Reads: any logged-in user. Writes: Admin only.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/requesttypes
public class RequestTypesController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public RequestTypesController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/requesttypes  -> all active types
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.RequestTypes
            .Include(r => r.Department)
            .Where(r => r.IsActive)
            .OrderBy(r => r.Department!.Name).ThenBy(r => r.Name)
            .Select(r => new
            {
                r.RequestTypeId,
                r.DepartmentId,
                DepartmentName = r.Department!.Name,
                r.Name,
                r.IsActive,
                r.CreatedAt
            })
            .ToListAsync();
        return Ok(list);
    }

    // GET /api/requesttypes/by-department/1  -> the request types available in one department
    [HttpGet("by-department/{departmentId:int}")]
    public async Task<IActionResult> GetByDepartment(int departmentId)
    {
        var list = await _db.RequestTypes
            .Where(r => r.IsActive && r.DepartmentId == departmentId)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return Ok(list);
    }

    // GET /api/requesttypes/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var rt = await _db.RequestTypes
            .Include(r => r.Department)
            .FirstOrDefaultAsync(r => r.RequestTypeId == id);

        if (rt == null) return NotFound();
        return Ok(rt);
    }

    // POST /api/requesttypes  (Admin only)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] RequestTypeCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var deptExists = await _db.Departments.AnyAsync(d => d.DepartmentId == dto.DepartmentId);
        if (!deptExists)
        {
            return BadRequest(new { message = "Department not found." });
        }

        var rt = new RequestType
        {
            DepartmentId = dto.DepartmentId,
            Name = dto.Name.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.RequestTypes.Add(rt);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = rt.RequestTypeId }, rt);
    }

    // PUT /api/requesttypes/5  (Admin only)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] RequestTypeUpdateDto dto)
    {
        var rt = await _db.RequestTypes.FindAsync(id);
        if (rt == null) return NotFound();

        rt.DepartmentId = dto.DepartmentId;
        rt.Name = dto.Name.Trim();
        rt.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(rt);
    }

    // DELETE /api/requesttypes/5  (Admin only) — soft delete.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var rt = await _db.RequestTypes.FindAsync(id);
        if (rt == null) return NotFound();

        rt.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
