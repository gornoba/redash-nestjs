import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { DataSourceGroupEntity } from '@app/database/entities/data-source-group.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { GroupEntity } from '@app/database/entities/group.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { CreateDataSourceHandler } from './commands/handlers/create-data-source.handler';
import { DeleteDataSourceHandler } from './commands/handlers/delete-data-source.handler';
import { TestDataSourceHandler } from './commands/handlers/test-data-source.handler';
import { UpdateDataSourceHandler } from './commands/handlers/update-data-source.handler';
import { DataSourceController } from './controllers/data-source.controller';
import { GetDataSourceSchemaHandler } from './queries/handlers/get-data-source-schema.handler';
import { GetDataSourceTypesHandler } from './queries/handlers/get-data-source-types.handler';
import { GetDataSourceHandler } from './queries/handlers/get-data-source.handler';
import { GetDataSourcesHandler } from './queries/handlers/get-data-sources.handler';
import { DataSourceRepository } from './repositories/data-source.repository';
import { DataSourceService } from './services/data-source.service';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      DataSourceEntity,
      DataSourceGroupEntity,
      GroupEntity,
      QueryEntity,
      QueryResultEntity,
    ]),
    CurrentUserModule,
  ],
  controllers: [DataSourceController],
  providers: [
    DataSourceService,
    DataSourceRepository,
    CreateDataSourceHandler,
    UpdateDataSourceHandler,
    TestDataSourceHandler,
    DeleteDataSourceHandler,
    GetDataSourceTypesHandler,
    GetDataSourcesHandler,
    GetDataSourceHandler,
    GetDataSourceSchemaHandler,
  ],
  exports: [DataSourceService],
})
export class DataSourceModule {}
