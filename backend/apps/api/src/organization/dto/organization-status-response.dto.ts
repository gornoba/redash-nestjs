import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const organizationStatusResponseSchema = z.object({
  object_counters: z.object({
    users: z.number().int(),
    alerts: z.number().int(),
    data_sources: z.number().int(),
    queries: z.number().int(),
    dashboards: z.number().int(),
  }),
  visible_groups: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
    }),
  ),
  visible_users: z.array(
    z.object({
      id: z.number().int(),
      email: z.string().email(),
      name: z.string(),
    }),
  ),
});

export class OrganizationStatusResponseDto extends createZodDto(
  organizationStatusResponseSchema,
) {}
