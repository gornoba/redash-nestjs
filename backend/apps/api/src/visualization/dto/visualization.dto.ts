import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const visualizationOptionsSchema = z.record(z.string(), z.unknown());

export const visualizationItemSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  query_id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  options: visualizationOptionsSchema,
  updated_at: z.string(),
  created_at: z.string(),
});

export class VisualizationResponseDto extends createZodDto(
  visualizationItemSchema,
) {}

export const saveVisualizationRequestSchema = z.object({
  query_id: z.number().int().positive(),
  type: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  options: visualizationOptionsSchema.default({}),
});

export class SaveVisualizationRequestDto extends createZodDto(
  saveVisualizationRequestSchema,
) {}

export const visualizationIdParamSchema = z.object({
  visualizationId: z.coerce.number().int().positive(),
});

export class VisualizationIdParamDto extends createZodDto(
  visualizationIdParamSchema,
) {}

export const publicEmbedQuerySchema = z.object({
  api_key: z.string().trim().min(1),
});

export class PublicEmbedQueryDto extends createZodDto(publicEmbedQuerySchema) {}

const queryExecutionColumnSchema = z.object({
  friendly_name: z.string(),
  name: z.string(),
  type: z.string().nullable(),
});

const queryExecutionDataSchema = z.object({
  columns: z.array(queryExecutionColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  truncated: z.boolean(),
});

const publicQueryResultSchema = z.object({
  id: z.number().int(),
  data_source_id: z.number().int(),
  query: z.string(),
  data: queryExecutionDataSchema,
  runtime: z.number(),
  retrieved_at: z.string(),
});

export const publicEmbedResponseSchema = z.object({
  query: z.object({
    id: z.number().int(),
    name: z.string(),
    api_key: z.string(),
  }),
  visualization: visualizationItemSchema,
  query_result: publicQueryResultSchema.nullable(),
});

export class PublicEmbedResponseDto extends createZodDto(
  publicEmbedResponseSchema,
) {}
