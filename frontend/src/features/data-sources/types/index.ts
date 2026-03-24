export interface DataSourceTypeOption {
  name: string;
  value: string;
}

export interface DataSourceSchemaProperty {
  default?: boolean | number | string;
  description?: string;
  extendedEnum?: DataSourceTypeOption[];
  options?: DataSourceTypeOption[];
  title?: string;
  type: string;
}

export interface DataSourceConfigurationSchema {
  extra_options?: string[];
  order?: string[];
  properties: Record<string, DataSourceSchemaProperty>;
  required?: string[];
  secret?: string[];
  type: string;
}

export interface DataSourceTypeDefinition {
  configuration_schema: DataSourceConfigurationSchema;
  name: string;
  supports_auto_limit: boolean;
  syntax: string;
  type: string;
}

export interface DataSourceGroupAccess {
  id: number;
  name: string;
  view_only: boolean;
}

export interface DataSourceSummary {
  can_execute_query: boolean;
  can_view_query: boolean;
  id: number;
  name: string;
  pause_reason: string | null;
  paused: boolean;
  supports_auto_limit: boolean;
  syntax: string;
  type: string;
  view_only: boolean;
}

export interface DataSourceDetail {
  groups: DataSourceGroupAccess[];
  id: number;
  name: string;
  options: Record<string, unknown>;
  pause_reason: string | null;
  paused: boolean;
  queue_name: string;
  scheduled_queue_name: string;
  supports_auto_limit: boolean;
  syntax: string;
  type: string;
  view_only: boolean;
}

export interface DataSourceSchemaColumn {
  comment: string | null;
  is_foreign_key: boolean;
  is_primary_key: boolean;
  name: string;
  type: string | null;
}

export interface DataSourceSchemaTable {
  columns: DataSourceSchemaColumn[];
  comment: string | null;
  name: string;
}

export interface DataSourceSchemaRelation {
  id: string;
  source_cardinality: 'many' | 'one';
  source_column: string;
  source_table: string;
  target_cardinality: 'many' | 'one';
  target_column: string;
  target_table: string;
}

export interface DataSourceSchemaResponse {
  has_columns: boolean;
  relations: DataSourceSchemaRelation[];
  schema: DataSourceSchemaTable[];
}

export interface DataSourceTestResponse {
  message: string;
  ok: boolean;
}

export interface SaveDataSourcePayload {
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
  options?: DataSourceTypeOption[];
  placeholder?: string | null;
  required?: boolean;
  title: string;
  type: 'checkbox' | 'file' | 'number' | 'password' | 'select' | 'text';
}
