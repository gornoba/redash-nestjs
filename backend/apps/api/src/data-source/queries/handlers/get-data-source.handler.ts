import { ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetDataSourceQuery } from '../get-data-source.query';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@QueryHandler(GetDataSourceQuery)
export class GetDataSourceHandler implements IQueryHandler<GetDataSourceQuery> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(query: GetDataSourceQuery) {
    const dataSource = await this.dataSourceRepository.getDataSourceById(
      query.user.orgId,
      query.dataSourceId,
    );
    const groups = await this.dataSourceRepository.getDataSourceGroups(
      dataSource.id,
    );

    if (!query.user.roles.includes('admin')) {
      if (!this.dataSourceService.canViewDataSourceSettings(query.user)) {
        throw new ForbiddenException('이 리소스에 접근할 권한이 없습니다.');
      }

      // 상세 설정은 list 권한만으로는 부족하고, 실제 연결된 group membership 까지 확인해야 한다.
      const hasAccess = groups.some((group) =>
        query.user.groupIds.includes(group.groupId),
      );

      if (!hasAccess) {
        throw new ForbiddenException('이 리소스에 접근할 권한이 없습니다.');
      }
    }

    return this.dataSourceService.buildDetailResponse(dataSource, groups);
  }
}
