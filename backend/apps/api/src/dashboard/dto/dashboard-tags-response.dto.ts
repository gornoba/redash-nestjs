import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dashboardTagSchema = z.object({
  name: z.string(),
  count: z.number().int(),
});

export const dashboardTagsResponseSchema = z.object({
  tags: z.array(dashboardTagSchema),
});

export class DashboardTagsResponseDto extends createZodDto(
  dashboardTagsResponseSchema,
) {}
