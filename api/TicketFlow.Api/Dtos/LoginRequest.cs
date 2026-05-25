namespace TicketFlow.Api.Dtos;

// What the client POSTs to /api/auth/login
public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
