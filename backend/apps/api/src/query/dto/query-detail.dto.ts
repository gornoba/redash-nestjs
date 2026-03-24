import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { queryResultSchema } from './query-execution.dto';
import {
  queryListItemSchema,
  visualizationItemSchema,
} from './query-list-response.dto';

const sanitizedTagsSchema = z.preprocess(
  (value): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    return [];
  },
  z.array(z.string().trim().min(1)).default([]),
);

export const queryIdParamSchema = z.object({
  queryId: z.coerce.number().int().positive(),
});

export class QueryIdParamDto extends createZodDto(queryIdParamSchema) {}

export const queryDetailResponseSchema = queryListItemSchema.extend({
  latest_query_data: queryResultSchema.nullable().optional(),
  visualizations: z.array(visualizationItemSchema),
});

export class QueryDetailResponseDto extends createZodDto(
  queryDetailResponseSchema,
) {}

export const updateQueryScheduleRequestSchema = z.object({
  schedule: z.record(z.string(), z.unknown()).nullable(),
});

export class UpdateQueryScheduleRequestDto extends createZodDto(
  updateQueryScheduleRequestSchema,
) {}

export const saveQueryRequestSchema = z.object({
  data_source_id: z.number().int().positive(),
  description: z.string().trim().nullable().optional(),
  is_draft: z.boolean().optional(),
  latest_query_data_id: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1),
  options: z.record(z.string(), z.unknown()).default({}),
  query: z.string(),
  schedule: z.record(z.string(), z.unknown()).nullable().optional(),
  tags: sanitizedTagsSchema,
  version: z.number().int().positive().optional(),
});

export class SaveQueryRequestDto extends createZodDto(saveQueryRequestSchema) {}
