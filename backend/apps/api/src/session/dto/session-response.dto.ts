import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const sessionUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  groups: z.array(z.number().int()),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  profile_image_url: z.string(),
});

const clientConfigSchema = z.object({
  basePath: z.string(),
  pageSize: z.number().int(),
  allowScriptsInUserInput: z.boolean(),
  dateFormat: z.string(),
  timeFormat: z.string(),
  timezone: z.string(),
  dateFormatList: z.array(z.string()),
  timeFormatList: z.array(z.string()),
  queryRefreshIntervals: z.array(z.number().int()),
  dateTimeFormat: z.string(),
  mailSettingsMissing: z.boolean(),
  settingsHomePath: z.string(),
});

export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
  messages: z.array(z.string()),
  org_slug: z.string(),
  client_config: clientConfigSchema,
});

export class SessionResponseDto extends createZodDto(sessionResponseSchema) {}
