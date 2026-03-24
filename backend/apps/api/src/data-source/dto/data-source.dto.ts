import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { DATA_SOURCE_TYPE_DEFINITIONS } from '../data-source.constants';

const configSchemaPropertySchema = z.object({
  default: z.unknown().optional(),
  extendedEnum: z
    .array(
      z.object({
        value: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  title: z.string().optional(),
  type: z.string(),
});

const configurationSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.string(), configSchemaPropertySchema),
  order: z.array(z.string()).optional(),
  required: z.array(z.string()).optional(),
  secret: z.array(z.string()).optional(),
  extra_options: z.array(z.string()).optional(),
});

const dataSourceTypeSchema = z.object({
  name: z.string(),
  type: z.enum(
    DATA_SOURCE_TYPE_DEFINITIONS.map((item) => item.type) as [
      string,
      ...string[],
    ],
  ),
  syntax: z.string(),
  supports_auto_limit: z.boolean(),
  configuration_schema: configurationSchemaSchema,
});

export const dataSourceTypeListResponseSchema = z.array(dataSourceTypeSchema);

export class DataSourceTypeListResponseDto extends createZodDto(
  dataSourceTypeListResponseSchema,
) {}

const dataSourceGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  view_only: z.boolean(),
});

export const dataSourceSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  paused: z.boolean(),
  pause_reason: z.string().nullable(),
  syntax: z.string(),
  supports_auto_limit: z.boolean(),
  view_only: z.boolean(),
  can_view_query: z.boolean(),
  can_execute_query: z.boolean(),
});

export const dataSourceListResponseSchema = z.array(dataSourceSummarySchema);

export class DataSourceListResponseDto extends createZodDto(
  dataSourceListResponseSchema,
) {}

export const dataSourceDetailResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  syntax: z.string(),
  paused: z.boolean(),
  pause_reason: z.string().nullable(),
  supports_auto_limit: z.boolean(),
  options: z.record(z.string(), z.unknown()),
  queue_name: z.string(),
  scheduled_queue_name: z.string(),
  groups: z.array(dataSourceGroupSchema),
  view_only: z.boolean(),
});

export class DataSourceDetailResponseDto extends createZodDto(
  dataSourceDetailResponseSchema,
) {}

const dataSourceSchemaColumnSchema = z.object({
  is_foreign_key: z.boolean(),
  is_primary_key: z.boolean(),
  name: z.string(),
  type: z.string().nullable(),
  comment: z.string().nullable(),
});

const dataSourceSchemaTableSchema = z.object({
  name: z.string(),
  comment: z.string().nullable(),
  columns: z.array(dataSourceSchemaColumnSchema),
});

const dataSourceSchemaRelationSchema = z.object({
  id: z.string(),
  source_table: z.string(),
  source_column: z.string(),
  source_cardinality: z.enum(['many', 'one']),
  target_table: z.string(),
  target_column: z.string(),
  target_cardinality: z.enum(['many', 'one']),
});

export const dataSourceSchemaResponseSchema = z.object({
  schema: z.array(dataSourceSchemaTableSchema),
  has_columns: z.boolean(),
  relations: z.array(dataSourceSchemaRelationSchema),
});

export type DataSourceSchemaColumn = z.infer<
  typeof dataSourceSchemaColumnSchema
>;
export type DataSourceSchemaRelation = z.infer<
  typeof dataSourceSchemaRelationSchema
>;
export type DataSourceSchemaResponse = z.infer<
  typeof dataSourceSchemaResponseSchema
>;
export type DataSourceSchemaTable = z.infer<typeof dataSourceSchemaTableSchema>;

export class DataSourceSchemaResponseDto extends createZodDto(
  dataSourceSchemaResponseSchema,
) {}

export const saveDataSourceRequestSchema = z.object({
  name: z.string().min(1),
  options: z.record(z.string(), z.unknown()),
  type: z.enum(
    DATA_SOURCE_TYPE_DEFINITIONS.map((item) => item.type) as [
      string,
      ...string[],
    ],
  ),
});

export class SaveDataSourceRequestDto extends createZodDto(
  saveDataSourceRequestSchema,
) {}

export const dataSourceIdParamSchema = z.object({
  dataSourceId: z.coerce.number().int().positive(),
});

export class DataSourceIdParamDto extends createZodDto(
  dataSourceIdParamSchema,
) {}

export const dataSourceTestResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});

export class DataSourceTestResponseDto extends createZodDto(
  dataSourceTestResponseSchema,
) {}

export const dataSourceSchemaQuerySchema = z.object({
  refresh: z.coerce.boolean().optional(),
});

export class DataSourceSchemaQueryDto extends createZodDto(
  dataSourceSchemaQuerySchema,
) {}
