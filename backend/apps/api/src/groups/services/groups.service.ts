import { ForbiddenException, Injectable } from '@nestjs/common';

import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  isUserInvitationPending,
  toUserDetailsRecord,
} from '@app/common/utils/user-details';
import { GroupsRepository } from '../repositories/groups.repository';

@Injectable()
export class GroupsService {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly currentUserService: CurrentUserService,
  ) {}

  ensureAdmin(currentUser: AuthenticatedUser) {
    if (!currentUser.roles.includes('admin')) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
  }

  ensureCanAccessGroup(currentUser: AuthenticatedUser, groupId: number) {
    if (
      currentUser.roles.includes('admin') ||
      currentUser.groupIds.includes(groupId)
    ) {
      return;
    }

    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  ensureCanAccessGroupDataSources(
    currentUser: AuthenticatedUser,
    groupId: number,
  ) {
    if (currentUser.roles.includes('admin')) {
      return;
    }

    if (
      (currentUser.permissions.includes('list_data_sources') ||
        currentUser.permissions.includes('view_source')) &&
      currentUser.groupIds.includes(groupId)
    ) {
      return;
    }

    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  async getMemberCount(group: { id: number; orgId: number }) {
    const users = await this.groupsRepository.getUsers(group.orgId);

    return users.filter((user) => (user.groupIds ?? []).includes(group.id))
      .length;
  }

  serializeGroup(
    group: {
      id: number;
      name: string;
      type: string;
      permissions: string[] | null;
      createdAt: Date;
    },
    memberCount: number,
  ) {
    return {
      id: group.id,
      name: group.name,
      type: group.type,
      permissions: group.permissions ?? [],
      member_count: memberCount,
      created_at: group.createdAt.toISOString(),
    };
  }

  serializeUser(user: {
    id: number;
    name: string;
    email: string;
    profileImageUrl: string | null;
    details: Record<string, unknown> | null;
    disabledAt: Date | null;
    createdAt: Date;
  }) {
    const details = toUserDetailsRecord(user.details);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile_image_url: this.currentUserService.getProfileImageUrl(
        user as Parameters<
          typeof this.currentUserService.getProfileImageUrl
        >[0],
      ),
      is_disabled: Boolean(user.disabledAt),
      is_invitation_pending: isUserInvitationPending(user.details),
      created_at: user.createdAt.toISOString(),
      active_at:
        typeof details.active_at === 'string' ? details.active_at : null,
    };
  }
}
