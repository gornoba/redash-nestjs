import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  isUserInvitationPending,
  toUserDetailsRecord,
} from '@app/common/utils/user-details';
import type { QuerySnippetEntity } from '@app/database/entities/query-snippet.entity';
import { SettingsRepository } from '../repositories/settings.repository';
import {
  getAvailableSettingsMenuItems,
  pickGeneralOrganizationSettings,
} from '../settings.constants';
import type {
  SaveQuerySnippetRequestDto,
  UpdateOrganizationSettingsDto,
} from '../dto/settings-response.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly currentUserService: CurrentUserService,
  ) {}

  getMenu(user: AuthenticatedUser) {
    const items = getAvailableSettingsMenuItems(user).map((item) => ({
      key: item.key,
      title: item.title,
      path: item.path,
    }));

    return {
      items,
      first_path: items[0]?.path ?? '/settings/account',
    };
  }

  async getAccount(user: AuthenticatedUser) {
    const groups = await this.settingsRepository.getGroupsByIds(
      user.orgId,
      user.groupIds,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_image_url: user.profileImageUrl,
        roles: user.roles,
        permissions: user.permissions,
        groups: groups.map((group) => ({
          id: group.id,
          name: group.name,
          type: group.type,
        })),
      },
    };
  }

  async getOrganizationSettings(user: AuthenticatedUser) {
    const organization = await this.settingsRepository.getOrganizationSettings(
      user.orgId,
    );

    return {
      settings: pickGeneralOrganizationSettings(organization.settings),
    };
  }

  async updateOrganizationSettings(
    user: AuthenticatedUser,
    payload: UpdateOrganizationSettingsDto,
  ) {
    const organization = await this.settingsRepository.getOrganizationById(
      user.orgId,
    );

    organization.settings = {
      ...(organization.settings ?? {}),
      ...payload,
    };

    await this.settingsRepository.saveOrganization(organization);

    return {
      settings: pickGeneralOrganizationSettings(organization.settings),
    };
  }

  async getUsers(user: AuthenticatedUser) {
    const [users, groups] = await Promise.all([
      this.settingsRepository.getUsers(user.orgId),
      this.settingsRepository.getGroups(user.orgId),
    ]);

    const groupsById = new Map(groups.map((group) => [group.id, group]));
    const visibleGroupIds = new Set(
      user.roles.includes('admin')
        ? groups.map((group) => group.id)
        : user.groupIds,
    );
    const visibleUsers = user.roles.includes('admin')
      ? users
      : users.filter((candidate) =>
          (candidate.groupIds ?? []).some((groupId) =>
            visibleGroupIds.has(groupId),
          ),
        );

    return {
      items: visibleUsers.map((candidate) => {
        const userDetails = toUserDetailsRecord(candidate.details);

        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          profile_image_url:
            this.currentUserService.getProfileImageUrl(candidate),
          is_disabled: Boolean(candidate.disabledAt),
          is_invitation_pending: isUserInvitationPending(candidate.details),
          groups: (candidate.groupIds ?? [])
            .filter((groupId) => visibleGroupIds.has(groupId))
            .map((groupId) => groupsById.get(groupId))
            .filter((group): group is NonNullable<typeof group> =>
              Boolean(group),
            )
            .map((group) => ({
              id: group.id,
              name: group.name,
            })),
          created_at: candidate.createdAt.toISOString(),
          active_at:
            typeof userDetails.active_at === 'string'
              ? userDetails.active_at
              : null,
        };
      }),
    };
  }

  async getGroups(user: AuthenticatedUser) {
    const [allGroups, users] = await Promise.all([
      this.settingsRepository.getGroups(user.orgId),
      this.settingsRepository.getUsers(user.orgId),
    ]);

    const groups = user.roles.includes('admin')
      ? allGroups
      : allGroups.filter((group) => user.groupIds.includes(group.id));

    const memberCount = new Map<number, number>();
    for (const group of groups) {
      memberCount.set(group.id, 0);
    }

    for (const candidate of users) {
      for (const groupId of candidate.groupIds ?? []) {
        memberCount.set(groupId, (memberCount.get(groupId) ?? 0) + 1);
      }
    }

    return {
      items: groups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        permissions: group.permissions ?? [],
        member_count: memberCount.get(group.id) ?? 0,
        created_at: group.createdAt.toISOString(),
      })),
    };
  }

  async getDataSources(user: AuthenticatedUser) {
    if (!this.canViewDataSources(user)) {
      throw new ForbiddenException('이 리소스에 접근할 권한이 없습니다.');
    }

    const dataSources = await this.settingsRepository.getDataSources(
      user.orgId,
    );

    if (user.roles.includes('admin')) {
      return {
        items: dataSources.map((dataSource) => ({
          id: dataSource.id,
          name: dataSource.name,
          type: dataSource.type,
          created_at: dataSource.createdAt.toISOString(),
        })),
      };
    }

    const dataSourceGroups =
      await this.settingsRepository.getDataSourceGroupsByDataSourceIds(
        dataSources.map((dataSource) => dataSource.id),
      );
    const accessibleDataSourceIds = new Set(
      dataSourceGroups
        .filter((group) => user.groupIds.includes(group.groupId))
        .map((group) => group.dataSourceId),
    );

    return {
      items: dataSources
        .filter((dataSource) => accessibleDataSourceIds.has(dataSource.id))
        .map((dataSource) => ({
          id: dataSource.id,
          name: dataSource.name,
          type: dataSource.type,
          created_at: dataSource.createdAt.toISOString(),
        })),
    };
  }

  async getDestinations(user: AuthenticatedUser) {
    const destinations = await this.settingsRepository.getDestinations(
      user.orgId,
    );

    return {
      items: destinations.map((destination) => ({
        id: destination.id,
        name: destination.name,
        type: destination.type,
        user_name: destination.user?.name ?? 'Unknown',
        created_at: destination.createdAt.toISOString(),
      })),
    };
  }

  async getQuerySnippets(user: AuthenticatedUser) {
    const snippets = await this.settingsRepository.getQuerySnippets(user.orgId);

    return {
      items: snippets.map((snippet) => this.serializeQuerySnippet(snippet)),
    };
  }

  async createQuerySnippet(
    user: AuthenticatedUser,
    payload: SaveQuerySnippetRequestDto,
  ) {
    const trigger = payload.trigger.trim();

    if (!trigger) {
      throw new BadRequestException('Trigger is required.');
    }

    if (!payload.snippet.trim()) {
      throw new BadRequestException('Snippet is required.');
    }

    const existingSnippet =
      await this.settingsRepository.findQuerySnippetByTrigger(trigger);

    if (existingSnippet) {
      throw new ConflictException('Query snippet trigger already exists.');
    }

    const snippet = this.settingsRepository.createQuerySnippet({
      description: payload.description,
      orgId: user.orgId,
      snippet: payload.snippet,
      trigger,
      userId: user.id,
    });

    const savedSnippet =
      await this.settingsRepository.saveQuerySnippet(snippet);
    const hydratedSnippet = await this.settingsRepository.getQuerySnippetById(
      user.orgId,
      savedSnippet.id,
    );

    return this.serializeQuerySnippet(hydratedSnippet);
  }

  async updateQuerySnippet(
    user: AuthenticatedUser,
    snippetId: number,
    payload: SaveQuerySnippetRequestDto,
  ) {
    const snippet = await this.settingsRepository.getQuerySnippetById(
      user.orgId,
      snippetId,
    );

    this.ensureCanManageQuerySnippet(user, snippet.userId);

    const trigger = payload.trigger.trim();

    if (!trigger) {
      throw new BadRequestException('Trigger is required.');
    }

    if (!payload.snippet.trim()) {
      throw new BadRequestException('Snippet is required.');
    }

    const existingSnippet =
      await this.settingsRepository.findQuerySnippetByTrigger(
        trigger,
        snippet.id,
      );

    if (existingSnippet) {
      throw new ConflictException('Query snippet trigger already exists.');
    }

    snippet.trigger = trigger;
    snippet.description = payload.description;
    snippet.snippet = payload.snippet;

    const savedSnippet =
      await this.settingsRepository.saveQuerySnippet(snippet);

    return this.serializeQuerySnippet(savedSnippet);
  }

  async deleteQuerySnippet(user: AuthenticatedUser, snippetId: number) {
    const snippet = await this.settingsRepository.getQuerySnippetById(
      user.orgId,
      snippetId,
    );

    this.ensureCanManageQuerySnippet(user, snippet.userId);

    await this.settingsRepository.deleteQuerySnippet(user.orgId, snippetId);
  }

  private serializeQuerySnippet(snippet: QuerySnippetEntity) {
    return {
      id: snippet.id,
      trigger: snippet.trigger,
      description: snippet.description,
      snippet: snippet.snippet,
      user: {
        id: snippet.user?.id ?? snippet.userId,
        name: snippet.user?.name ?? 'Unknown',
        profile_image_url: snippet.user
          ? this.currentUserService.getProfileImageUrl(snippet.user)
          : '',
      },
      user_name: snippet.user?.name ?? 'Unknown',
      created_at: snippet.createdAt.toISOString(),
    };
  }

  private ensureCanManageQuerySnippet(
    user: AuthenticatedUser,
    snippetOwnerId: number,
  ) {
    if (user.roles.includes('admin') || user.id === snippetOwnerId) {
      return;
    }

    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  private canViewDataSources(user: AuthenticatedUser) {
    return (
      user.roles.includes('admin') ||
      user.permissions.includes('list_data_sources')
    );
  }
}
