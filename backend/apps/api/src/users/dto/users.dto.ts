import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const userGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const userGroupIdListSchema = z.array(z.number().int());

const userSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  profile_image_url: z.string(),
  is_disabled: z.boolean(),
  is_invitation_pending: z.boolean(),
  groups: z.array(userGroupSchema),
  created_at: z.string(),
  active_at: z.string().nullable(),
  invite_link: z.string().optional(),
  reset_link: z.string().optional(),
});

export const createUserRequestSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export class CreateUserRequestDto extends createZodDto(
  createUserRequestSchema,
) {}

export class CreateUserResponseDto extends createZodDto(userSummarySchema) {}

export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export class UserIdParamDto extends createZodDto(userIdParamSchema) {}

export const updateUserRequestSchema = z.object({
  email: z.string().trim().email().optional(),
  group_ids: userGroupIdListSchema.optional(),
  name: z.string().trim().min(1).optional(),
  old_password: z.string().optional(),
  password: z.string().min(6).optional(),
});

export class UpdateUserRequestDto extends createZodDto(
  updateUserRequestSchema,
) {}

export const userGroupOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const userDetailResponseSchema = z.object({
  user: userSummarySchema.extend({
    api_key: z.string().nullable(),
    group_ids: userGroupIdListSchema,
  }),
  all_groups: z.array(userGroupOptionSchema),
});

export class UserDetailResponseDto extends createZodDto(
  userDetailResponseSchema,
) {}

export const inviteTokenParamSchema = z.object({
  token: z.string().min(1),
});

export class InviteTokenParamDto extends createZodDto(inviteTokenParamSchema) {}

export const linkTokenQuerySchema = z.object({
  token: z.string().min(1),
});

export class LinkTokenQueryDto extends createZodDto(linkTokenQuerySchema) {}

export const inviteDetailsResponseSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

export class InviteDetailsResponseDto extends createZodDto(
  inviteDetailsResponseSchema,
) {}

export const acceptInviteRequestSchema = z.object({
  password: z.string().min(6),
});

export class AcceptInviteRequestDto extends createZodDto(
  acceptInviteRequestSchema,
) {}

export const acceptInviteResponseSchema = z.object({
  message: z.string(),
});

export class AcceptInviteResponseDto extends createZodDto(
  acceptInviteResponseSchema,
) {}

export const linkTokenDetailsResponseSchema = z.object({
  mode: z.enum(['invite', 'reset']),
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

export class LinkTokenDetailsResponseDto extends createZodDto(
  linkTokenDetailsResponseSchema,
) {}

export const acceptLinkRequestSchema = z.object({
  token: z.string().min(1).optional(),
  password: z.string().min(6),
});

export class AcceptLinkRequestDto extends createZodDto(
  acceptLinkRequestSchema,
) {}

export const acceptLinkResponseSchema = z.object({
  message: z.string(),
});

export class AcceptLinkResponseDto extends createZodDto(
  acceptLinkResponseSchema,
) {}
