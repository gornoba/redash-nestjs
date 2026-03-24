import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const tagsSchema = z.preprocess(
  (value): string[] => {
    if (value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value === 'string' && value.length > 0) {
      return [value];
    }

    return [];
  },
  z.array(z.string().trim().min(1)).default([]),
);

export const dashboardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(250).default(25),
  q: z.string().trim().optional(),
  order: z.enum(['name', '-name', 'created_at', '-created_at']).optional(),
  tags: tagsSchema,
});

export class DashboardListQueryDto extends createZodDto(
  dashboardListQuerySchema,
) {}
