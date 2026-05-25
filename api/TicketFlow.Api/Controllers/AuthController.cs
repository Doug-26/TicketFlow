using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Services;

namespace TicketFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]   // route = /api/auth
public class AuthController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(TicketFlowDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // POST /api/auth/login
    // Body: { "email": "...", "password": "..." }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 1. Find the employee by email (also load Role so we can put it in the JWT).
        var employee = await _db.Employees
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Email == request.Email);

        if (employee == null || !employee.IsActive)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // 2. Verify the supplied password against the stored BCrypt hash.
        bool valid;
        try
        {
            valid = BCrypt.Net.BCrypt.Verify(request.Password, employee.PasswordHash);
        }
        catch
        {
            // If PasswordHash is still PLACEHOLDER_HASH (seeder hasn't run yet) BCrypt will throw.
            valid = false;
        }

        if (!valid)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // 3. Build a JWT for this employee.
        var token = _jwt.Create(employee);

        return Ok(new LoginResponse
        {
            Token = token,
            EmployeeId = employee.EmployeeId,
            FullName = employee.FullName,
            Role = employee.Role!.Name,
            DepartmentId = employee.DepartmentId
        });
    }
}
