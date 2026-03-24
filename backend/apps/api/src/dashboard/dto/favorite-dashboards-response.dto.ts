import { createZodDto } from 'nestjs-zod';
import { dashboardListResponseSchema } from './dashboard-list-response.dto';

export const favoriteDashboardsResponseSchema = dashboardListResponseSchema;

export class FavoriteDashboardsResponseDto extends createZodDto(
  favoriteDashboardsResponseSchema,
) {}
