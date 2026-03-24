import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createDashboardRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export class CreateDashboardRequestDto extends createZodDto(
  createDashboardRequestSchema,
) {}
