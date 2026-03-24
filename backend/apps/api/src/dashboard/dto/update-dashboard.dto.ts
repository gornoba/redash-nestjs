import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const tagsSchema = z.preprocess(
  (value): string[] | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    return undefined;
  },
  z.array(z.string().trim().min(1)).optional(),
);

export const updateDashboardRequestSchema = z
  .object({
    dashboard_filters_enabled: z.boolean().optional(),
    is_draft: z.boolean().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    tags: tagsSchema,
    version: z.number().int().positive().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.dashboard_filters_enabled !== undefined ||
      value.is_draft !== undefined ||
      value.options !== undefined ||
      value.tags !== undefined,
    {
      message: '변경할 대시보드 값이 필요합니다.',
    },
  );

export class UpdateDashboardRequestDto extends createZodDto(
  updateDashboardRequestSchema,
) {}
