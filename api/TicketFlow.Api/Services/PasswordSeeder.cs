using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;

namespace TicketFlow.Api.Services;

// Runs once at startup. Replaces any "PLACEHOLDER_HASH" rows (from the DB seed)
// with a real BCrypt hash of the default dev password "Password@123".
// After the first successful run, this becomes a no-op because no rows match.
public class PasswordSeeder : IHostedService
{
    private const string PlaceholderHash = "PLACEHOLDER_HASH";
    private const string DefaultDevPassword = "Password@123";

    private readonly IServiceProvider _services;
    private readonly ILogger<PasswordSeeder> _logger;

    public PasswordSeeder(IServiceProvider services, ILogger<PasswordSeeder> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // We need a scoped DbContext, but PasswordSeeder is a singleton.
        // Create our own scope to resolve it.
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TicketFlowDbContext>();

        try
        {
            var placeholders = await db.Employees
                .Where(e => e.PasswordHash == PlaceholderHash)
                .ToListAsync(cancellationToken);

            if (placeholders.Count == 0)
            {
                return; // Nothing to do.
            }

            var realHash = BCrypt.Net.BCrypt.HashPassword(DefaultDevPassword);
            foreach (var emp in placeholders)
            {
                emp.PasswordHash = realHash;
            }

            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "PasswordSeeder: replaced {Count} placeholder password hashes. Default dev password is '{Password}'.",
                placeholders.Count, DefaultDevPassword);
        }
        catch (Exception ex)
        {
            // Don't crash app startup if DB is unreachable; just log it.
            _logger.LogWarning(ex, "PasswordSeeder skipped (DB unreachable or table missing).");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
