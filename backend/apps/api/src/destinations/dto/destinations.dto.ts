import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { DESTINATION_TYPE_DEFINITIONS } from '../destinations.constants';

const configSchemaPropertySchema = z.object({
  default: z.unknown().optional(),
  description: z.string().optional(),
  extendedEnum: z
    .array(
      z.object({
        value: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  title: z.string().optional(),
  type: z.string(),
});

const configurationSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.string(), configSchemaPropertySchema),
  order: z.array(z.string()).optional(),
  required: z.array(z.string()).optional(),
  secret: z.array(z.string()).optional(),
  extra_options: z.array(z.string()).optional(),
});

const destinationTypeSchema = z.object({
  name: z.string(),
  type: z.enum(
    DESTINATION_TYPE_DEFINITIONS.map((item) => item.type) as [
      string,
      ...string[],
    ],
  ),
  configuration_schema: configurationSchemaSchema,
});

export const destinationTypeListResponseSchema = z.array(destinationTypeSchema);

export class DestinationTypeListResponseDto extends createZodDto(
  destinationTypeListResponseSchema,
) {}

export const destinationSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
});

export const destinationListResponseSchema = z.array(destinationSummarySchema);

export class DestinationListResponseDto extends createZodDto(
  destinationListResponseSchema,
) {}

export const destinationDetailResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  options: z.record(z.string(), z.unknown()),
});

export class DestinationDetailResponseDto extends createZodDto(
  destinationDetailResponseSchema,
) {}

export const saveDestinationRequestSchema = z.object({
  name: z.string().min(1),
  options: z.record(z.string(), z.unknown()),
  type: z.enum(
    DESTINATION_TYPE_DEFINITIONS.map((item) => item.type) as [
      string,
      ...string[],
    ],
  ),
});

export class SaveDestinationRequestDto extends createZodDto(
  saveDestinationRequestSchema,
) {}

export const destinationIdParamSchema = z.object({
  destinationId: z.coerce.number().int().positive(),
});

export class DestinationIdParamDto extends createZodDto(
  destinationIdParamSchema,
) {}
