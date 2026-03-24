import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryResultColumnSchema = z.object({
  friendly_name: z.string(),
  name: z.string(),
  type: z.string().nullable(),
});

const queryResultDataSchema = z.object({
  columns: z.array(queryResultColumnSchema),
  limit: z
    .object({
      applied_limit: z.number().int().positive(),
      did_apply_default_limit: z.boolean(),
      did_cap_limit: z.boolean(),
      requested_limit: z.number().int().positive().nullable(),
    })
    .optional(),
  rows: z.array(z.record(z.string(), z.unknown())),
  truncated: z.boolean().default(false),
});

export const queryResultSchema = z.object({
  data: queryResultDataSchema,
  data_source_id: z.number().int().positive(),
  id: z.number().int().positive(),
  query: z.string(),
  retrieved_at: z.string(),
  runtime: z.number(),
});

export const executeQueryRequestSchema = z.object({
  data_source_id: z.number().int().positive(),
  persist_latest_query_data: z.boolean().optional(),
  query: z.string().trim().min(1),
  query_id: z.number().int().positive().nullable().optional(),
});

export class ExecuteQueryRequestDto extends createZodDto(
  executeQueryRequestSchema,
) {}

export const executeQueryResponseSchema = z.object({
  job_id: z.string(),
  state: z.literal('queued'),
});

export class ExecuteQueryResponseDto extends createZodDto(
  executeQueryResponseSchema,
) {}

export class QueryExecutionResultDto extends createZodDto(queryResultSchema) {}

export const queryResultIdParamSchema = z.object({
  queryResultId: z.coerce.number().int().positive(),
});

export class QueryResultIdParamDto extends createZodDto(
  queryResultIdParamSchema,
) {}

export const executeQueryJobStatusResponseSchema = z.object({
  error: z.string().nullable(),
  job_id: z.string(),
  query_result_id: z.number().int().positive().optional(),
  state: z.enum(['queued', 'running', 'completed', 'failed']),
});

export class ExecuteQueryJobStatusResponseDto extends createZodDto(
  executeQueryJobStatusResponseSchema,
) {}
