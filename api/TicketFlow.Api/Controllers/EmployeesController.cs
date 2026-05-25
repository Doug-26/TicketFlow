using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// Any logged-in user can list/get employees.
// Only HR or Admin can create/update/deactivate them.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/employees
public class EmployeesController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public EmployeesController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/employees
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Employees
            .Include(e => e.Role)
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .OrderBy(e => e.FullName)
            .Select(e => MapToDto(e))
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/employees/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var emp = await _db.Employees
            .Include(e => e.Role)
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.EmployeeId == id);

        if (emp == null) return NotFound();
        return Ok(MapToDto(emp));
    }

    // GET /api/employees/by-department/3
    // Handy for the assignment screen: list active employees in a given department.
    [HttpGet("by-department/{departmentId:int}")]
    public async Task<IActionResult> GetByDepartment(int departmentId)
    {
        var list = await _db.Employees
            .Include(e => e.Role)
            .Include(e => e.Department)
            .Where(e => e.IsActive && e.DepartmentId == departmentId)
            .OrderBy(e => e.FullName)
            .Select(e => MapToDto(e))
            .ToListAsync();

        return Ok(list);
    }

    // POST /api/employees  (HR or Admin only)
    [HttpPost]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Create([FromBody] EmployeeCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "FullName, Email and Password are required." });
        }

        // Email must be unique
        var emailTaken = await _db.Employees.AnyAsync(e => e.Email == dto.Email);
        if (emailTaken)
        {
            return BadRequest(new { message = "Email is already in use." });
        }

        var emp = new Employee
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = dto.RoleId,
            DepartmentId = dto.DepartmentId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Employees.Add(emp);
        await _db.SaveChangesAsync();

        // Re-load with navs so the response includes role/department names.
        await _db.Entry(emp).Reference(e => e.Role).LoadAsync();
        await _db.Entry(emp).Reference(e => e.Department).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = emp.EmployeeId }, MapToDto(emp));
    }

    // PUT /api/employees/5  (HR or Admin only)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] EmployeeUpdateDto dto)
    {
        var emp = await _db.Employees.FindAsync(id);
        if (emp == null) return NotFound();

        emp.FullName = dto.FullName.Trim();
        emp.Email = dto.Email.Trim();
        emp.RoleId = dto.RoleId;
        emp.DepartmentId = dto.DepartmentId;
        emp.IsActive = dto.IsActive;

        // Only re-hash if a new password was provided.
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            emp.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _db.SaveChangesAsync();

        await _db.Entry(emp).Reference(e => e.Role).LoadAsync();
        await _db.Entry(emp).Reference(e => e.Department).LoadAsync();

        return Ok(MapToDto(emp));
    }

    // DELETE /api/employees/5  (Admin only) — soft delete.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var emp = await _db.Employees.FindAsync(id);
        if (emp == null) return NotFound();

        emp.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Small helper to convert an Employee entity into the safe DTO we return.
    private static EmployeeListItemDto MapToDto(Employee e) => new()
    {
        EmployeeId = e.EmployeeId,
        FullName = e.FullName,
        Email = e.Email,
        RoleId = e.RoleId,
        RoleName = e.Role?.Name ?? string.Empty,
        DepartmentId = e.DepartmentId,
        DepartmentName = e.Department?.Name,
        IsActive = e.IsActive,
        CreatedAt = e.CreatedAt
    };
}
