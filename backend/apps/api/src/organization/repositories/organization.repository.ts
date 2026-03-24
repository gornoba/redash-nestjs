import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
    @InjectRepository(DashboardEntity)
    private readonly dashboardRepository: Repository<DashboardEntity>,
  ) {}

  async getStatus(user: AuthenticatedUser) {
    const [
      users,
      alerts,
      dataSources,
      queries,
      dashboards,
      allUsers,
      allGroups,
    ] = await Promise.all([
      this.userRepository.count({
        where: {
          orgId: user.orgId,
        },
      }),
      this.alertRepository
        .createQueryBuilder('alert')
        .innerJoin('alert.query', 'query')
        .where('query.org_id = :orgId', { orgId: user.orgId })
        .getCount(),
      this.dataSourceRepository.count({
        where: {
          orgId: user.orgId,
        },
      }),
      this.queryRepository.count({
        where: {
          orgId: user.orgId,
          isArchived: false,
        },
      }),
      this.dashboardRepository.count({
        where: {
          orgId: user.orgId,
          isArchived: false,
        },
      }),
      this.userRepository.find({
        select: { id: true, name: true, email: true, groupIds: true },
        where: {
          orgId: user.orgId,
        },
        order: {
          name: 'ASC',
        },
      }),
      this.groupRepository.find({
        select: { id: true, name: true, permissions: true },
        where: {
          orgId: user.orgId,
        },
        order: {
          name: 'ASC',
        },
      }),
    ]);

    const visibleGroups = user.roles.includes('admin')
      ? allGroups
      : allGroups.filter((group) => user.groupIds.includes(group.id));
    const listUsersGroupIds = allGroups
      .filter((group) => (group.permissions ?? []).includes('list_users'))
      .map((group) => group.id);
    const visibleUsers = user.roles.includes('admin')
      ? allUsers
      : allUsers.filter((candidate) =>
          (candidate.groupIds ?? []).some((groupId) =>
            listUsersGroupIds.includes(groupId),
          ),
        );

    return {
      object_counters: {
        users,
        alerts,
        data_sources: dataSources,
        queries,
        dashboards,
      },
      visible_groups: visibleGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
      visible_users: visibleUsers.map((candidate) => ({
        id: candidate.id,
        email: candidate.email,
        name: candidate.name,
      })),
    };
  }
}
