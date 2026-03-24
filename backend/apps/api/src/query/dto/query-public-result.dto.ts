import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { queryResultSchema } from './query-execution.dto';

export const publicQueryResultResponseSchema = z.object({
  query_result: queryResultSchema,
});

export class PublicQueryResultResponseDto extends createZodDto(
  publicQueryResultResponseSchema,
) {}
