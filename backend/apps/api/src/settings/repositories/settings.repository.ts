import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { QuerySnippetEntity } from '@app/database/entities/query-snippet.entity';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(DataSourceGroupEntity)
    private readonly dataSourceGroupRepository: Repository<DataSourceGroupEntity>,
    @InjectRepository(NotificationDestinationEntity)
    private readonly destinationRepository: Repository<NotificationDestinationEntity>,
    @InjectRepository(QuerySnippetEntity)
    private readonly querySnippetRepository: Repository<QuerySnippetEntity>,
  ) {}

  async getOrganizationById(orgId: number) {
    const organization = await this.organizationRepository.findOneBy({
      id: orgId,
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    return organization;
  }

  /** 읽기 전용 — settings만 필요한 조회에 사용 */
  async getOrganizationSettings(orgId: number) {
    const organization = await this.organizationRepository.findOne({
      select: { id: true, settings: true },
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    return organization;
  }

  async saveOrganization(organization: OrganizationEntity) {
    return this.organizationRepository.save(organization);
  }

  async getGroupsByIds(orgId: number, groupIds: number[]) {
    if (groupIds.length === 0) {
      return [];
    }

    return this.groupRepository.find({
      select: { id: true, name: true, type: true },
      where: {
        orgId,
        id: In(groupIds),
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /** 민감 컬럼(passwordHash, apiKey)을 제외한 사용자 목록 조회 */
  async getUsers(orgId: number) {
    return this.userRepository.find({
      select: {
        id: true,
        name: true,
        email: true,
        profileImageUrl: true,
        groupIds: true,
        disabledAt: true,
        details: true,
        createdAt: true,
      },
      where: {
        orgId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getActiveUserById(orgId: number, userId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        orgId,
        disabledAt: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('활성 사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async getGroups(orgId: number) {
    return this.groupRepository.find({
      select: {
        id: true,
        name: true,
        type: true,
        permissions: true,
        createdAt: true,
      },
      where: {
        orgId,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async getDataSources(orgId: number) {
    return this.dataSourceRepository.find({
      select: { id: true, name: true, type: true, createdAt: true },
      where: {
        orgId,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async getDataSourceGroupsByDataSourceIds(dataSourceIds: number[]) {
    if (dataSourceIds.length === 0) {
      return [];
    }

    return this.dataSourceGroupRepository.find({
      select: { id: true, groupId: true, dataSourceId: true },
      where: dataSourceIds.map((dataSourceId) => ({ dataSourceId })),
      order: {
        id: 'ASC',
      },
    });
  }

  async getDestinations(orgId: number) {
    return this.destinationRepository.find({
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        user: { name: true },
      },
      where: {
        orgId,
      },
      relations: {
        user: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async getQuerySnippets(orgId: number) {
    return this.querySnippetRepository.find({
      select: {
        id: true,
        trigger: true,
        description: true,
        snippet: true,
        userId: true,
        createdAt: true,
        user: { id: true, name: true, email: true, profileImageUrl: true },
      },
      where: {
        orgId,
      },
      relations: {
        user: true,
      },
      order: {
        trigger: 'ASC',
      },
    });
  }

  async getQuerySnippetById(orgId: number, snippetId: number) {
    const snippet = await this.querySnippetRepository.findOne({
      where: {
        id: snippetId,
        orgId,
      },
      relations: {
        user: true,
      },
    });

    if (!snippet) {
      throw new NotFoundException('쿼리 스니펫을 찾을 수 없습니다.');
    }

    return snippet;
  }

  findQuerySnippetByTrigger(trigger: string, excludeId?: number) {
    return this.querySnippetRepository.findOne({
      select: { id: true },
      where: {
        trigger,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  createQuerySnippet(data: Partial<QuerySnippetEntity>) {
    return this.querySnippetRepository.create(data);
  }

  saveQuerySnippet(snippet: QuerySnippetEntity) {
    return this.querySnippetRepository.save(snippet);
  }

  deleteQuerySnippet(orgId: number, snippetId: number) {
    return this.querySnippetRepository.delete({
      id: snippetId,
      orgId,
    });
  }
}
