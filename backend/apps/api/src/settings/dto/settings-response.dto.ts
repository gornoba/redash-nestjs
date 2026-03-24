import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const settingsMenuItemSchema = z.object({
  key: z.string(),
  title: z.string(),
  path: z.string(),
});

export const settingsMenuResponseSchema = z.object({
  items: z.array(settingsMenuItemSchema),
  first_path: z.string(),
});

export class SettingsMenuResponseDto extends createZodDto(
  settingsMenuResponseSchema,
) {}

const settingsGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
});

export const settingsAccountResponseSchema = z.object({
  user: z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().email(),
    profile_image_url: z.string(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
    groups: z.array(settingsGroupSchema),
  }),
});

export class SettingsAccountResponseDto extends createZodDto(
  settingsAccountResponseSchema,
) {}

export const organizationSettingsSchema = z.object({
  date_format: z.string(),
  time_format: z.string(),
  timezone: z.string(),
  multi_byte_search_enabled: z.boolean(),
  send_email_on_failed_scheduled_queries: z.boolean(),
});

export class UpdateOrganizationSettingsDto extends createZodDto(
  organizationSettingsSchema,
) {}

export const organizationSettingsResponseSchema = z.object({
  settings: organizationSettingsSchema,
});

export class OrganizationSettingsResponseDto extends createZodDto(
  organizationSettingsResponseSchema,
) {}

const settingsUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  profile_image_url: z.string(),
  is_disabled: z.boolean(),
  is_invitation_pending: z.boolean(),
  groups: z.array(settingsGroupSchema.pick({ id: true, name: true })),
  created_at: z.string(),
  active_at: z.string().nullable(),
});

export const settingsUsersResponseSchema = z.object({
  items: z.array(settingsUserSchema),
});

export class SettingsUsersResponseDto extends createZodDto(
  settingsUsersResponseSchema,
) {}

const settingsListGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  permissions: z.array(z.string()),
  member_count: z.number().int(),
  created_at: z.string(),
});

export const settingsGroupsResponseSchema = z.object({
  items: z.array(settingsListGroupSchema),
});

export class SettingsGroupsResponseDto extends createZodDto(
  settingsGroupsResponseSchema,
) {}

const settingsDataSourceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  created_at: z.string(),
});

export const settingsDataSourcesResponseSchema = z.object({
  items: z.array(settingsDataSourceSchema),
});

export class SettingsDataSourcesResponseDto extends createZodDto(
  settingsDataSourcesResponseSchema,
) {}

const settingsDestinationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  user_name: z.string(),
  created_at: z.string(),
});

export const settingsDestinationsResponseSchema = z.object({
  items: z.array(settingsDestinationSchema),
});

export class SettingsDestinationsResponseDto extends createZodDto(
  settingsDestinationsResponseSchema,
) {}

const settingsSnippetSchema = z.object({
  id: z.number().int(),
  trigger: z.string(),
  description: z.string(),
  snippet: z.string(),
  user: z.object({
    id: z.number().int(),
    name: z.string(),
    profile_image_url: z.string(),
  }),
  user_name: z.string(),
  created_at: z.string(),
});

export const settingsQuerySnippetsResponseSchema = z.object({
  items: z.array(settingsSnippetSchema),
});

export class SettingsQuerySnippetsResponseDto extends createZodDto(
  settingsQuerySnippetsResponseSchema,
) {}

export class SettingsQuerySnippetItemDto extends createZodDto(
  settingsSnippetSchema,
) {}

export const saveQuerySnippetRequestSchema = z.object({
  trigger: z.string().min(1),
  description: z.string(),
  snippet: z.string().min(1),
});

export class SaveQuerySnippetRequestDto extends createZodDto(
  saveQuerySnippetRequestSchema,
) {}

export const settingsQuerySnippetIdParamSchema = z.object({
  snippetId: z.coerce.number().int().positive(),
});

export class SettingsQuerySnippetIdParamDto extends createZodDto(
  settingsQuerySnippetIdParamSchema,
) {}
