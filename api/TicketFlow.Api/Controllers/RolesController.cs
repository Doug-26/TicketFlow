using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// All endpoints require a valid JWT. Writes require Admin role.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/roles
public class RolesController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public RolesController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/roles
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Roles
            .Where(r => r.IsActive)
            .OrderBy(r => r.Name)
            .ToListAsync();
        return Ok(list);
    }

    // GET /api/roles/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();
        return Ok(role);
    }

    // POST /api/roles  (Admin only)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] RoleCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var role = new Role
        {
            Name = dto.Name.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = role.RoleId }, role);
    }

    // PUT /api/roles/5  (Admin only)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] RoleUpdateDto dto)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();

        role.Name = dto.Name.Trim();
        role.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(role);
    }

    // DELETE /api/roles/5  (Admin only) — soft delete.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var role = await _db.Roles.FindAsync(id);
        if (role == null) return NotFound();

        role.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
