export interface DestinationTypeOption {
  name: string;
  value: string;
}

export interface DestinationSchemaProperty {
  default?: boolean | number | string;
  description?: string;
  extendedEnum?: DestinationTypeOption[];
  options?: DestinationTypeOption[];
  title?: string;
  type: string;
}

export interface DestinationConfigurationSchema {
  extra_options?: string[];
  order?: string[];
  properties: Record<string, DestinationSchemaProperty>;
  required?: string[];
  secret?: string[];
  type: string;
}

export interface DestinationTypeDefinition {
  configuration_schema: DestinationConfigurationSchema;
  name: string;
  type: string;
}

export interface DestinationDetail {
  id: number;
  name: string;
  options: Record<string, unknown>;
  type: string;
}

export interface DestinationListItem {
  id: number;
  name: string;
  type: string;
}

export interface SaveDestinationPayload {
  name: string;
  options: Record<string, unknown>;
  type: string;
}

export interface DynamicField {
  autoFocus?: boolean;
  description?: string;
  extra?: boolean;
  initialValue?: boolean | number | string | null;
  name: string;
  options?: DestinationTypeOption[];
  placeholder?: string | null;
  required?: boolean;
  title: string;
  type: 'checkbox' | 'file' | 'number' | 'password' | 'select' | 'text';
}
