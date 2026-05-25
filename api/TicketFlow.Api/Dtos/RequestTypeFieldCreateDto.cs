namespace TicketFlow.Api.Dtos;

// Input for POST /api/requesttypefields
public class RequestTypeFieldCreateDto
{
    public int RequestTypeId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string FieldLabel { get; set; } = string.Empty;
    public string FieldType { get; set; } = string.Empty;     // text, number, select, radio, checkbox, date
    public string? FieldOptionsJson { get; set; }              // JSON array for select/radio etc., e.g. '["8GB","16GB"]'
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
}
