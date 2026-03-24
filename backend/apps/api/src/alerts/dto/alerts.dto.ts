import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const alertListUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const alertQuerySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  schedule: z.record(z.string(), z.unknown()).nullable(),
});

const alertDetailUserSchema = z.object({
  id: z.number().int(),
});

export const alertResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  options: z.record(z.string(), z.unknown()),
  state: z.string(),
  last_triggered_at: z.string().nullable(),
  updated_at: z.string(),
  created_at: z.string(),
  rearm: z.number().int().nullable(),
  query: alertQuerySchema,
  user: alertDetailUserSchema,
});

const alertListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  muted: z.boolean(),
  state: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
  user: alertListUserSchema,
});

export const alertListResponseSchema = z.array(alertListItemSchema);

export class AlertListResponseDto extends createZodDto(
  alertListResponseSchema,
) {}

export class AlertResponseDto extends createZodDto(alertResponseSchema) {}

const alertListOrderSchema = z.enum([
  'muted',
  '-muted',
  'name',
  '-name',
  'state',
  '-state',
  'updated_at',
  '-updated_at',
  'created_at',
  '-created_at',
]);

export const alertListQuerySchema = z.object({
  order: alertListOrderSchema.optional(),
  q: z.string().trim().optional(),
});

export class AlertListQueryDto extends createZodDto(alertListQuerySchema) {}

export const saveAlertRequestSchema = z.object({
  name: z.string(),
  options: z.record(z.string(), z.unknown()),
  query_id: z.number().int().positive(),
  rearm: z.number().int().positive().nullable().optional(),
});

export class SaveAlertRequestDto extends createZodDto(saveAlertRequestSchema) {}

export const alertIdParamSchema = z.object({
  alertId: z.coerce.number().int().positive(),
});

export class AlertIdParamDto extends createZodDto(alertIdParamSchema) {}

const subscriptionDestinationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
});

export const alertSubscriptionResponseSchema = z.object({
  id: z.number().int(),
  user: z.object({
    id: z.number().int(),
    email: z.string().email(),
  }),
  destination: subscriptionDestinationSchema.optional(),
});

export const alertSubscriptionListResponseSchema = z.array(
  alertSubscriptionResponseSchema,
);

export class AlertSubscriptionListResponseDto extends createZodDto(
  alertSubscriptionListResponseSchema,
) {}

export class AlertSubscriptionResponseDto extends createZodDto(
  alertSubscriptionResponseSchema,
) {}

export const createAlertSubscriptionRequestSchema = z.object({
  destination_id: z.number().int().positive().optional(),
});

export class CreateAlertSubscriptionRequestDto extends createZodDto(
  createAlertSubscriptionRequestSchema,
) {}

export const alertSubscriptionParamSchema = z.object({
  alertId: z.coerce.number().int().positive(),
  subscriptionId: z.coerce.number().int().positive(),
});

export class AlertSubscriptionParamDto extends createZodDto(
  alertSubscriptionParamSchema,
) {}
