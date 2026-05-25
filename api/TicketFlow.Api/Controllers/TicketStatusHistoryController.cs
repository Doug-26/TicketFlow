using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;

namespace TicketFlow.Api.Controllers;

// Read-only. History rows are written automatically by TicketsController
// (on create and on every status change).
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/ticketstatushistory
public class TicketStatusHistoryController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public TicketStatusHistoryController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/ticketstatushistory/by-ticket/5  -> full timeline for a ticket
    [HttpGet("by-ticket/{ticketId:int}")]
    public async Task<IActionResult> GetByTicket(int ticketId)
    {
        var ticketExists = await _db.Tickets.AnyAsync(t => t.TicketId == ticketId);
        if (!ticketExists) return NotFound();

        var rows = await _db.TicketStatusHistory
            .Include(h => h.ChangedByEmployee)
            .Where(h => h.TicketId == ticketId)
            .OrderBy(h => h.ChangedAt)
            .Select(h => new TicketStatusHistoryDto
            {
                HistoryId = h.HistoryId,
                TicketId = h.TicketId,
                OldStatus = h.OldStatus,
                NewStatus = h.NewStatus,
                ChangedByEmployeeId = h.ChangedByEmployeeId,
                ChangedByEmployeeName = h.ChangedByEmployee != null ? h.ChangedByEmployee.FullName : string.Empty,
                Remarks = h.Remarks,
                ChangedAt = h.ChangedAt
            })
            .ToListAsync();

        return Ok(rows);
    }

    // GET /api/ticketstatushistory/5  -> single row (rarely used; handy for debugging)
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await _db.TicketStatusHistory
            .Include(h => h.ChangedByEmployee)
            .FirstOrDefaultAsync(h => h.HistoryId == id);

        if (row == null) return NotFound();

        return Ok(new TicketStatusHistoryDto
        {
            HistoryId = row.HistoryId,
            TicketId = row.TicketId,
            OldStatus = row.OldStatus,
            NewStatus = row.NewStatus,
            ChangedByEmployeeId = row.ChangedByEmployeeId,
            ChangedByEmployeeName = row.ChangedByEmployee?.FullName ?? string.Empty,
            Remarks = row.Remarks,
            ChangedAt = row.ChangedAt
        });
    }
}
