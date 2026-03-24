import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const favoritesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
});

export class FavoritesQueryDto extends createZodDto(favoritesQuerySchema) {}
