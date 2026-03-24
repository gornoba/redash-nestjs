import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const favoriteQueryItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  query: z.string(),
  is_archived: z.boolean(),
  is_draft: z.boolean(),
  is_favorite: z.boolean(),
});

export const favoriteQueriesResponseSchema = z.object({
  count: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
  results: z.array(favoriteQueryItemSchema),
});

export class FavoriteQueriesResponseDto extends createZodDto(
  favoriteQueriesResponseSchema,
) {}
