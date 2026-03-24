import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetDataSourceSchemaQuery } from '../get-data-source-schema.query';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@QueryHandler(GetDataSourceSchemaQuery)
export class GetDataSourceSchemaHandler implements IQueryHandler<GetDataSourceSchemaQuery> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(query: GetDataSourceSchemaQuery) {
    void query.refresh;

    const dataSource = await this.dataSourceRepository.getDataSourceById(
      query.user.orgId,
      query.dataSourceId,
    );
    const definition = this.dataSourceService.getDefinitionOrThrow(
      dataSource.type,
    );
    const options = this.dataSourceService.parseOptions(
      dataSource.encryptedOptions,
    );

    return this.dataSourceService.getSchema(definition.type, options);
  }
}
