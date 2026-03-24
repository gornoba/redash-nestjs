import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { RequirePermissions } from '@app/common/decorators/permissions.decorator';
import { RequireRoles } from '@app/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  DataSourceDetailResponseDto,
  DataSourceIdParamDto,
  DataSourceListResponseDto,
  DataSourceSchemaQueryDto,
  DataSourceSchemaResponseDto,
  DataSourceTestResponseDto,
  DataSourceTypeListResponseDto,
  SaveDataSourceRequestDto,
} from '../dto/data-source.dto';
import { CreateDataSourceCommand } from '../commands/create-data-source.command';
import { DeleteDataSourceCommand } from '../commands/delete-data-source.command';
import { TestDataSourceCommand } from '../commands/test-data-source.command';
import { UpdateDataSourceCommand } from '../commands/update-data-source.command';
import { GetDataSourceSchemaQuery } from '../queries/get-data-source-schema.query';
import { GetDataSourceTypesQuery } from '../queries/get-data-source-types.query';
import { GetDataSourceQuery } from '../queries/get-data-source.query';
import { GetDataSourcesQuery } from '../queries/get-data-sources.query';

@ApiTags('data-sources')
@Controller('data_sources')
export class DataSourceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('types')
  @ApiOperation({ summary: '생성 가능한 데이터 소스 타입 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '데이터 소스 타입 목록',
    type: DataSourceTypeListResponseDto,
  })
  getTypes() {
    // 타입 목록은 읽기 전용 메타데이터라 query bus 로만 흘려 보낸다.
    return this.queryBus.execute(new GetDataSourceTypesQuery());
  }

  @Get()
  @ApiOperation({ summary: '데이터 소스 목록을 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '데이터 소스 목록',
    type: DataSourceListResponseDto,
  })
  getDataSources(@CurrentUser() user: AuthenticatedUser) {
    // 목록 조회는 권한 필터링이 포함된 read flow 라서 command 와 분리한다.
    return this.queryBus.execute(new GetDataSourcesQuery(user));
  }

  @Get(':dataSourceId')
  @ApiOperation({ summary: '데이터 소스 상세 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '데이터 소스 상세',
    type: DataSourceDetailResponseDto,
  })
  getDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DataSourceIdParamDto,
  ) {
    // 상세 조회도 같은 도메인을 보더라도 state mutation 이 없으므로 query 로 유지한다.
    return this.queryBus.execute(
      new GetDataSourceQuery(user, params.dataSourceId),
    );
  }

  @RequirePermissions('view_query')
  @Get(':dataSourceId/schema')
  @ApiOperation({ summary: '데이터 소스의 스키마와 컬럼 정보를 조회합니다.' })
  @ZodResponse({
    status: 200,
    description: '데이터 소스 스키마',
    type: DataSourceSchemaResponseDto,
  })
  getDataSourceSchema(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DataSourceIdParamDto,
    @Query() query: DataSourceSchemaQueryDto,
  ) {
    // refresh 플래그는 조회 정책만 바꾸므로 schema lookup 역시 query 경로에 둔다.
    return this.queryBus.execute(
      new GetDataSourceSchemaQuery(
        user,
        params.dataSourceId,
        query.refresh ?? false,
      ),
    );
  }

  @RequireRoles('admin')
  @Post()
  @ApiOperation({ summary: '새 데이터 소스를 생성합니다.' })
  @ZodResponse({
    status: 201,
    description: '생성된 데이터 소스',
    type: DataSourceDetailResponseDto,
  })
  createDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SaveDataSourceRequestDto,
  ) {
    // 생성은 이름 검증, 기본 그룹 연결, 옵션 암호화가 같이 일어나므로 command 로 분리한다.
    return this.commandBus.execute(new CreateDataSourceCommand(user, payload));
  }

  @RequireRoles('admin')
  @Post(':dataSourceId')
  @ApiOperation({ summary: '데이터 소스를 수정합니다.' })
  @ZodResponse({
    status: 201,
    description: '수정된 데이터 소스',
    type: DataSourceDetailResponseDto,
  })
  updateDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DataSourceIdParamDto,
    @Body() payload: SaveDataSourceRequestDto,
  ) {
    // 수정은 기존 secret option 보존 규칙이 있어서 read model 과 섞지 않고 command 로 보낸다.
    return this.commandBus.execute(
      new UpdateDataSourceCommand(user, params.dataSourceId, payload),
    );
  }

  @RequireRoles('admin')
  @Post(':dataSourceId/test')
  @ApiOperation({ summary: '데이터 소스 연결 테스트를 수행합니다.' })
  @ZodResponse({
    status: 201,
    description: '연결 테스트 결과',
    type: DataSourceTestResponseDto,
  })
  testDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DataSourceIdParamDto,
  ) {
    // 연결 테스트는 외부 시스템에 부수효과 없이 쓰기 계열 관리 동작만 수행하므로 command 로 취급한다.
    return this.commandBus.execute(
      new TestDataSourceCommand(user, params.dataSourceId),
    );
  }

  @RequireRoles('admin')
  @Delete(':dataSourceId')
  @HttpCode(204)
  @ApiOperation({ summary: '데이터 소스를 삭제합니다.' })
  deleteDataSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: DataSourceIdParamDto,
  ) {
    // 삭제는 관련 query result 와 group relation 정리를 포함하므로 command 경로로 고정한다.
    return this.commandBus.execute(
      new DeleteDataSourceCommand(user, params.dataSourceId),
    );
  }
}
