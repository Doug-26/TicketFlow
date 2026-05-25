// The kinds of dynamic fields the ticket form supports.
// Keep these strings in sync with what the API accepts.
export type FieldType = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'date';

export const FIELD_TYPES: FieldType[] = [
  'text',
  'number',
  'select',
  'radio',
  'checkbox',
  'date'
];

// Maps to dbo.RequestTypeFields.
export interface RequestTypeField {
  requestTypeFieldId: number;
  requestTypeId: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  fieldOptionsJson: string | null;   // JSON array string, e.g. '["8GB","16GB"]'
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface RequestTypeFieldCreate {
  requestTypeId: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  fieldOptionsJson: string | null;
  isRequired: boolean;
  displayOrder: number;
}

export interface RequestTypeFieldUpdate {
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  fieldOptionsJson: string | null;
  isRequired: boolean;
  displayOrder: number;
}
