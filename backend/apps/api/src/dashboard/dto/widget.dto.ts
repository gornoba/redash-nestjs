import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const widgetIdParamSchema = z.object({
  widgetId: z.coerce.number().int().positive(),
});

export class WidgetIdParamDto extends createZodDto(widgetIdParamSchema) {}

const widgetBasePayloadSchema = z.object({
  options: z.record(z.string(), z.unknown()).optional().default({}),
  text: z.string().nullable().optional(),
  visualization_id: z.number().int().positive().nullable().optional(),
  width: z.number().int().min(1).max(6).optional(),
});

export const createWidgetRequestSchema = widgetBasePayloadSchema
  .extend({
    dashboard_id: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (value.visualization_id === undefined && value.text === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '텍스트박스 또는 시각화 정보가 필요합니다.',
        path: ['text'],
      });
    }
  });

export class CreateWidgetRequestDto extends createZodDto(
  createWidgetRequestSchema,
) {}

export const updateWidgetRequestSchema = widgetBasePayloadSchema
  .extend({
    dashboard_id: z.number().int().positive().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.visualization_id === undefined &&
      value.text === undefined &&
      value.options === undefined &&
      value.width === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '변경할 위젯 값이 필요합니다.',
      });
    }
  });

export class UpdateWidgetRequestDto extends createZodDto(
  updateWidgetRequestSchema,
) {}

export const widgetResponseSchema = z.object({
  id: z.number().int(),
  visualization_id: z.number().int().nullable(),
  dashboard_id: z.number().int(),
  width: z.number().int(),
  options: z.record(z.string(), z.unknown()),
  text: z.string().nullable(),
  updated_at: z.string(),
  created_at: z.string(),
});

export class WidgetResponseDto extends createZodDto(widgetResponseSchema) {}
