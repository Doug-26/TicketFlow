using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// All endpoints require a valid JWT.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/departments
public class DepartmentsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public DepartmentsController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/departments  -> all active departments
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Departments
            .Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .ToListAsync();
        return Ok(list);
    }

    // GET /api/departments/5  -> single department or 404
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var dept = await _db.Departments.FindAsync(id);
        if (dept == null) return NotFound();
        return Ok(dept);
    }

    // POST /api/departments  -> create a new department
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DepartmentCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var dept = new Department
        {
            Name = dto.Name.Trim(),
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Departments.Add(dept);
        await _db.SaveChangesAsync();

        // 201 Created with a Location header pointing at GET /api/departments/{newId}
        return CreatedAtAction(nameof(GetById), new { id = dept.DepartmentId }, dept);
    }

    // PUT /api/departments/5  -> update an existing department
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] DepartmentUpdateDto dto)
    {
        var dept = await _db.Departments.FindAsync(id);
        if (dept == null) return NotFound();

        dept.Name = dto.Name.Trim();
        dept.Description = dto.Description;
        dept.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(dept);
    }

    // DELETE /api/departments/5  -> SOFT delete (sets IsActive = false).
    // We never physically delete because tickets/employees may reference this row.
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var dept = await _db.Departments.FindAsync(id);
        if (dept == null) return NotFound();

        dept.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();   // 204
    }
}
