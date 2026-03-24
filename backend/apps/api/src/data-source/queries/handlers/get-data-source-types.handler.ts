import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DATA_SOURCE_TYPE_DEFINITIONS } from '../../data-source.constants';
import { GetDataSourceTypesQuery } from '../get-data-source-types.query';

@QueryHandler(GetDataSourceTypesQuery)
export class GetDataSourceTypesHandler implements IQueryHandler<GetDataSourceTypesQuery> {
  execute(query: GetDataSourceTypesQuery) {
    void query;

    return Promise.resolve(DATA_SOURCE_TYPE_DEFINITIONS);
  }
}
