import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { GROUP_PERMISSION_OPTIONS } from '../groups.constants';

const groupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  permissions: z.array(z.string()),
  member_count: z.number().int(),
  created_at: z.string(),
});

const groupMemberSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  profile_image_url: z.string(),
  is_disabled: z.boolean(),
  is_invitation_pending: z.boolean(),
  created_at: z.string(),
  active_at: z.string().nullable(),
});

const groupDataSourceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  view_only: z.boolean(),
  created_at: z.string(),
});

export const groupsListResponseSchema = z.object({
  items: z.array(groupSchema),
});

export class GroupsListResponseDto extends createZodDto(
  groupsListResponseSchema,
) {}

export const groupDetailResponseSchema = z.object({
  group: groupSchema,
});

export class GroupDetailResponseDto extends createZodDto(
  groupDetailResponseSchema,
) {}

export const groupMembersResponseSchema = z.object({
  group: groupSchema,
  members: z.array(groupMemberSchema),
});

export class GroupMembersResponseDto extends createZodDto(
  groupMembersResponseSchema,
) {}

export const groupDataSourcesResponseSchema = z.object({
  group: groupSchema,
  data_sources: z.array(groupDataSourceSchema),
});

export class GroupDataSourcesResponseDto extends createZodDto(
  groupDataSourcesResponseSchema,
) {}

export const createGroupRequestSchema = z.object({
  name: z.string().trim().min(1),
});

export class CreateGroupRequestDto extends createZodDto(
  createGroupRequestSchema,
) {}

export const updateGroupRequestSchema = z.object({
  name: z.string().trim().min(1),
});

export class UpdateGroupRequestDto extends createZodDto(
  updateGroupRequestSchema,
) {}

export const updateGroupPermissionsRequestSchema = z.object({
  permissions: z.array(z.enum(GROUP_PERMISSION_OPTIONS)).default([]),
});

export class UpdateGroupPermissionsRequestDto extends createZodDto(
  updateGroupPermissionsRequestSchema,
) {}

export const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

export class GroupIdParamDto extends createZodDto(groupIdParamSchema) {}

export const groupMemberParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

export class GroupMemberParamDto extends createZodDto(groupMemberParamSchema) {}

export const groupDataSourceParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  dataSourceId: z.coerce.number().int().positive(),
});

export class GroupDataSourceParamDto extends createZodDto(
  groupDataSourceParamSchema,
) {}

export const addGroupMemberRequestSchema = z.object({
  user_id: z.number().int().positive(),
});

export class AddGroupMemberRequestDto extends createZodDto(
  addGroupMemberRequestSchema,
) {}

export const addGroupDataSourceRequestSchema = z.object({
  data_source_id: z.number().int().positive(),
});

export class AddGroupDataSourceRequestDto extends createZodDto(
  addGroupDataSourceRequestSchema,
) {}

export const updateGroupDataSourceRequestSchema = z.object({
  view_only: z.boolean(),
});

export class UpdateGroupDataSourceRequestDto extends createZodDto(
  updateGroupDataSourceRequestSchema,
) {}
