namespace TicketFlow.Api.Models;

// Maps to dbo.RequestTypeFields
public class RequestTypeField
{
    public int RequestTypeFieldId { get; set; }
    public int RequestTypeId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string FieldLabel { get; set; } = string.Empty;
    public string FieldType { get; set; } = string.Empty;   // text, number, select, radio, checkbox, date
    public string? FieldOptionsJson { get; set; }            // JSON array for select/radio choices
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; }

    public RequestType? RequestType { get; set; }
}
