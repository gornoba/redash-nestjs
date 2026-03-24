import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryTagSchema = z.object({
  name: z.string(),
  count: z.number().int(),
});

export const queryTagsResponseSchema = z.object({
  tags: z.array(queryTagSchema),
});

export class QueryTagsResponseDto extends createZodDto(
  queryTagsResponseSchema,
) {}
