import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';

import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { QueryEntity } from '@app/database/entities/query.entity';

@Injectable()
export class DataSourceRepository {
  constructor(
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(DataSourceGroupEntity)
    private readonly dataSourceGroupRepository: Repository<DataSourceGroupEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  // 목록 조회에서는 id, name, type 만 필요하므로 나머지(encryptedOptions 등)를 제외한다.
  async getDataSources(orgId: number) {
    return this.dataSourceRepository.find({
      select: ['id', 'name', 'type'],
      where: { orgId },
      order: { name: 'ASC' },
    });
  }

  async getDataSourceById(orgId: number, dataSourceId: number) {
    const dataSource = await this.dataSourceRepository.findOneBy({
      id: dataSourceId,
      orgId,
    });

    if (!dataSource) {
      throw new NotFoundException('데이터 소스를 찾을 수 없습니다.');
    }

    return dataSource;
  }

  // 상세 조회에서 그룹 이름과 viewOnly 만 필요하므로
  // group relation 에서 필요한 컬럼(id, name, permissions)만 select 한다.
  async getDataSourceGroups(dataSourceId: number) {
    return this.dataSourceGroupRepository
      .createQueryBuilder('dsg')
      .leftJoin('dsg.group', 'g')
      .select(['dsg.id', 'dsg.dataSourceId', 'dsg.groupId', 'dsg.viewOnly'])
      .addSelect(['g.id', 'g.name', 'g.permissions'])
      .where('dsg.dataSourceId = :dataSourceId', { dataSourceId })
      .orderBy('dsg.id', 'ASC')
      .getMany();
  }

  // 목록 조회에서 group permissions 와 viewOnly 만 필요하므로
  // group relation 에서 필요한 컬럼만 select 한다.
  async getDataSourceGroupsByDataSourceIds(dataSourceIds: number[]) {
    if (dataSourceIds.length === 0) {
      return [];
    }

    return this.dataSourceGroupRepository
      .createQueryBuilder('dsg')
      .leftJoin('dsg.group', 'g')
      .select(['dsg.id', 'dsg.dataSourceId', 'dsg.groupId', 'dsg.viewOnly'])
      .addSelect(['g.id', 'g.permissions'])
      .where('dsg.dataSourceId IN (:...dataSourceIds)', { dataSourceIds })
      .orderBy('dsg.id', 'ASC')
      .getMany();
  }

  // 기본 그룹 조회에서는 id 만 필요하다.
  async getDefaultGroup(orgId: number) {
    const group = await this.groupRepository.findOne({
      select: ['id'],
      where: {
        orgId,
        name: 'default',
      },
      order: {
        id: 'ASC',
      },
    });

    if (!group) {
      throw new NotFoundException('기본 그룹을 찾을 수 없습니다.');
    }

    return group;
  }

  // 이름 중복 검사에서는 존재 여부만 확인하면 되므로 id 만 select 한다.
  async findByName(orgId: number, name: string, excludeId?: number) {
    return this.dataSourceRepository.findOne({
      select: ['id'],
      where: {
        orgId,
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  createDataSource(data: Partial<DataSourceEntity>) {
    return this.dataSourceRepository.create(data);
  }

  async saveDataSource(dataSource: DataSourceEntity) {
    return this.dataSourceRepository.save(dataSource);
  }

  async createDataSourceWithDefaultGroup(
    dataSource: DataSourceEntity,
    defaultGroup: GroupEntity,
  ) {
    return this.entityManager.transaction(async (transaction) => {
      // 데이터 소스 생성과 기본 그룹 연결이 분리되면
      // 권한 없는 orphan data source 가 생길 수 있어 한 트랜잭션으로 묶는다.
      const savedDataSource = await transaction.save(
        DataSourceEntity,
        dataSource,
      );

      const dataSourceGroup = transaction.create(DataSourceGroupEntity, {
        dataSourceId: savedDataSource.id,
        groupId: defaultGroup.id,
        viewOnly: false,
      });

      await transaction.save(DataSourceGroupEntity, dataSourceGroup);

      return savedDataSource;
    });
  }

  async deleteDataSource(orgId: number, dataSourceId: number) {
    return this.entityManager.transaction(async (transaction) => {
      // 삭제 전에 query 와 result 쪽 참조를 먼저 끊어야
      // 레거시 Redash 스키마의 외래키/참조 무결성을 안전하게 맞출 수 있다.
      await transaction.update(
        QueryEntity,
        { orgId, dataSourceId },
        {
          dataSourceId: null,
          latestQueryDataId: null,
        },
      );

      await transaction.delete(QueryResultEntity, {
        orgId,
        dataSourceId,
      });

      await transaction.delete(DataSourceGroupEntity, {
        dataSourceId,
      });

      await transaction.delete(DataSourceEntity, {
        id: dataSourceId,
        orgId,
      });
    });
  }
}
