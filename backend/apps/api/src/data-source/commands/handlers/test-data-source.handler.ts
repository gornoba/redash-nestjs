import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TestDataSourceCommand } from '../test-data-source.command';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@CommandHandler(TestDataSourceCommand)
export class TestDataSourceHandler implements ICommandHandler<TestDataSourceCommand> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(command: TestDataSourceCommand) {
    const dataSource = await this.dataSourceRepository.getDataSourceById(
      command.user.orgId,
      command.dataSourceId,
    );
    const definition = this.dataSourceService.getDefinitionOrThrow(
      dataSource.type,
    );
    const options = this.dataSourceService.parseOptions(
      dataSource.encryptedOptions,
    );

    try {
      // 실제 저장 포맷을 기준으로 연결을 검증해야 운영 환경과 테스트 결과가 어긋나지 않는다.
      await this.dataSourceService.performConnectionTest(
        definition.type,
        options,
      );

      return {
        ok: true,
        message: 'success',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection failed.',
      };
    }
  }
}
