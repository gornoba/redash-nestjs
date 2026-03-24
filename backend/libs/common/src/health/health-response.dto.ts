import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const healthStatusSchema = z.object({
  service: z.string(),
  status: z.string(),
});

export class HealthStatusDto extends createZodDto(healthStatusSchema) {}
