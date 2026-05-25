using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Dtos;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

// Manages the dynamic fields belonging to a RequestType.
// Reads: any logged-in user. Writes: Admin only.
[ApiController]
[Authorize]
[Route("api/[controller]")]   // route = /api/requesttypefields
public class RequestTypeFieldsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;

    public RequestTypeFieldsController(TicketFlowDbContext db)
    {
        _db = db;
    }

    // GET /api/requesttypefields/by-type/1
    // The form-builder in Angular calls this when an employee picks a request type.
    [HttpGet("by-type/{requestTypeId:int}")]
    public async Task<IActionResult> GetByRequestType(int requestTypeId)
    {
        var fields = await _db.RequestTypeFields
            .Where(f => f.RequestTypeId == requestTypeId)
            .OrderBy(f => f.DisplayOrder).ThenBy(f => f.RequestTypeFieldId)
            .ToListAsync();
        return Ok(fields);
    }

    // GET /api/requesttypefields/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var field = await _db.RequestTypeFields.FindAsync(id);
        if (field == null) return NotFound();
        return Ok(field);
    }

    // POST /api/requesttypefields  (Admin only)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] RequestTypeFieldCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FieldName) ||
            string.IsNullOrWhiteSpace(dto.FieldLabel) ||
            string.IsNullOrWhiteSpace(dto.FieldType))
        {
            return BadRequest(new { message = "FieldName, FieldLabel and FieldType are required." });
        }

        var typeExists = await _db.RequestTypes.AnyAsync(r => r.RequestTypeId == dto.RequestTypeId);
        if (!typeExists)
        {
            return BadRequest(new { message = "RequestType not found." });
        }

        var field = new RequestTypeField
        {
            RequestTypeId = dto.RequestTypeId,
            FieldName = dto.FieldName.Trim(),
            FieldLabel = dto.FieldLabel.Trim(),
            FieldType = dto.FieldType.Trim(),
            FieldOptionsJson = dto.FieldOptionsJson,
            IsRequired = dto.IsRequired,
            DisplayOrder = dto.DisplayOrder,
            CreatedAt = DateTime.UtcNow
        };

        _db.RequestTypeFields.Add(field);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = field.RequestTypeFieldId }, field);
    }

    // PUT /api/requesttypefields/5  (Admin only)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] RequestTypeFieldUpdateDto dto)
    {
        var field = await _db.RequestTypeFields.FindAsync(id);
        if (field == null) return NotFound();

        field.FieldName = dto.FieldName.Trim();
        field.FieldLabel = dto.FieldLabel.Trim();
        field.FieldType = dto.FieldType.Trim();
        field.FieldOptionsJson = dto.FieldOptionsJson;
        field.IsRequired = dto.IsRequired;
        field.DisplayOrder = dto.DisplayOrder;

        await _db.SaveChangesAsync();
        return Ok(field);
    }

    // DELETE /api/requesttypefields/5  (Admin only) — HARD delete here
    // because RequestTypeFields aren't referenced by other tables.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var field = await _db.RequestTypeFields.FindAsync(id);
        if (field == null) return NotFound();

        _db.RequestTypeFields.Remove(field);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
