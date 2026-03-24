import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { dashboardListItemSchema } from './dashboard-list-response.dto';

const queryExecutionColumnSchema = z.object({
  friendly_name: z.string(),
  name: z.string(),
  type: z.string().nullable(),
});

const queryExecutionDataSchema = z.object({
  columns: z.array(queryExecutionColumnSchema),
  rows: z.array(z.record(z.string(), z.unknown())),
  truncated: z.boolean().default(false),
});

const dashboardWidgetSchema = z.object({
  id: z.number().int(),
  width: z.number().int(),
  options: z.record(z.string(), z.unknown()),
  text: z.string().nullable(),
  updated_at: z.string(),
  created_at: z.string(),
  visualization: z
    .object({
      id: z.number().int(),
      type: z.string(),
      query_id: z.number().int(),
      query_name: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      options: z.record(z.string(), z.unknown()),
    })
    .nullable(),
  query_result: z
    .object({
      id: z.number().int(),
      data_source_id: z.number().int(),
      query: z.string(),
      data: queryExecutionDataSchema,
      runtime: z.number(),
      retrieved_at: z.string(),
    })
    .nullable(),
});

export const dashboardDetailResponseSchema = dashboardListItemSchema.extend({
  widgets: z.array(dashboardWidgetSchema),
});

export class DashboardDetailResponseDto extends createZodDto(
  dashboardDetailResponseSchema,
) {}
