namespace TicketFlow.Api.Dtos;

// Input for PUT /api/requesttypefields/{id}
public class RequestTypeFieldUpdateDto
{
    public string FieldName { get; set; } = string.Empty;
    public string FieldLabel { get; set; } = string.Empty;
    public string FieldType { get; set; } = string.Empty;
    public string? FieldOptionsJson { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
}
