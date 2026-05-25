using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Services;

// Builds JWT tokens. Reads its config (Key, Issuer, Audience, ExpiryMinutes) from appsettings.
public class JwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string Create(Employee employee)
    {
        if (employee.Role is null)
        {
            throw new InvalidOperationException(
                "Employee.Role must be loaded (use .Include(e => e.Role)) before creating a token.");
        }

        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing in appsettings.");
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var expiryMinutes = int.Parse(_config["Jwt:ExpiryMinutes"] ?? "480");

        // These are the pieces of data we embed in the token.
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, employee.EmployeeId.ToString()),
            new(JwtRegisteredClaimNames.Email, employee.Email),
            new(ClaimTypes.Role, employee.Role.Name),     // lets [Authorize(Roles = "Admin")] work
            new("employeeId", employee.EmployeeId.ToString()),
            new("fullName", employee.FullName),
            new("departmentId", employee.DepartmentId?.ToString() ?? string.Empty),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
