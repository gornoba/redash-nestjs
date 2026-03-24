import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';

import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(DataSourceGroupEntity)
    private readonly dataSourceGroupRepository: Repository<DataSourceGroupEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  getGroups(orgId: number) {
    return this.groupRepository.find({
      select: {
        id: true,
        name: true,
        type: true,
        permissions: true,
        createdAt: true,
      },
      where: { orgId },
      order: { name: 'ASC' },
    });
  }

  async getGroupById(orgId: number, groupId: number) {
    const group = await this.groupRepository.findOneBy({
      id: groupId,
      orgId,
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다.');
    }

    return group;
  }

  findGroupByName(orgId: number, name: string, excludeId?: number) {
    return this.groupRepository.findOne({
      select: { id: true },
      where: {
        orgId,
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  createGroup(data: Partial<GroupEntity>) {
    return this.groupRepository.create(data);
  }

  saveGroup(group: GroupEntity) {
    return this.groupRepository.save(group);
  }

  /** 멤버 목록/카운트 조회 전용. 민감 컬럼(passwordHash, apiKey)을 제외한다. */
  getUsers(orgId: number) {
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
      where: { orgId },
      order: { name: 'ASC' },
    });
  }

  async getUserById(orgId: number, userId: number) {
    const user = await this.userRepository.findOneBy({
      id: userId,
      orgId,
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  saveUser(user: UserEntity) {
    return this.userRepository.save(user);
  }

  getDataSources(orgId: number) {
    return this.dataSourceRepository.find({
      select: { id: true, name: true, type: true, createdAt: true },
      where: { orgId },
      order: { name: 'ASC' },
    });
  }

  async getDataSourceById(orgId: number, dataSourceId: number) {
    const dataSource = await this.dataSourceRepository.findOne({
      select: { id: true },
      where: { id: dataSourceId, orgId },
    });

    if (!dataSource) {
      throw new NotFoundException('데이터 소스를 찾을 수 없습니다.');
    }

    return dataSource;
  }

  getDataSourceGroup(groupId: number, dataSourceId: number) {
    return this.dataSourceGroupRepository.findOneBy({
      groupId,
      dataSourceId,
    });
  }

  getGroupDataSources(groupId: number) {
    return this.dataSourceGroupRepository.find({
      select: {
        id: true,
        viewOnly: true,
        dataSource: { id: true, name: true, type: true, createdAt: true },
      },
      where: { groupId },
      relations: { dataSource: true },
      order: {
        dataSource: {
          name: 'ASC',
        },
      },
    });
  }

  createDataSourceGroup(data: Partial<DataSourceGroupEntity>) {
    return this.dataSourceGroupRepository.create(data);
  }

  saveDataSourceGroup(dataSourceGroup: DataSourceGroupEntity) {
    return this.dataSourceGroupRepository.save(dataSourceGroup);
  }

  deleteDataSourceGroup(groupId: number, dataSourceId: number) {
    return this.dataSourceGroupRepository.delete({ groupId, dataSourceId });
  }

  async deleteGroup(orgId: number, groupId: number) {
    return this.entityManager.transaction(async (transaction) => {
      const users = await transaction.find(UserEntity, {
        select: { id: true, groupIds: true },
        where: { orgId },
      });

      for (const user of users) {
        if (!(user.groupIds ?? []).includes(groupId)) {
          continue;
        }

        const nextGroupIds = (user.groupIds ?? []).filter(
          (id) => id !== groupId,
        );
        // select로 부분 로딩된 엔티티에 save()를 쓰면 미로딩 컬럼이 null로 덮일 수 있으므로 update 사용
        await transaction.update(
          UserEntity,
          { id: user.id },
          { groupIds: nextGroupIds },
        );
      }

      await transaction.delete(DataSourceGroupEntity, { groupId });
      await transaction.delete(GroupEntity, { id: groupId, orgId });
    });
  }
}
