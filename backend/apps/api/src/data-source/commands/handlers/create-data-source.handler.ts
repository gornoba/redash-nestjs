import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateDataSourceCommand } from '../create-data-source.command';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@CommandHandler(CreateDataSourceCommand)
export class CreateDataSourceHandler implements ICommandHandler<CreateDataSourceCommand> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(command: CreateDataSourceCommand) {
    const definition = this.dataSourceService.getDefinitionOrThrow(
      command.payload.type,
    );
    const name = command.payload.name.trim();

    if (!name) {
      throw new BadRequestException('데이터 소스 이름을 입력해주세요.');
    }

    await this.dataSourceService.ensureUniqueName(command.user.orgId, name);

    // 새 생성에서는 이전 secret 값이 없으므로 빈 옵션을 기준으로 정규화한다.
    const options = this.dataSourceService.normalizeOptions(
      definition,
      command.payload.options,
      {},
    );
    const defaultGroup = await this.dataSourceRepository.getDefaultGroup(
      command.user.orgId,
    );
    const dataSource = this.dataSourceRepository.createDataSource({
      orgId: command.user.orgId,
      name,
      type: command.payload.type,
      encryptedOptions: this.dataSourceService.serializeOptions(options),
      queueName: 'queries',
      scheduledQueueName: 'scheduled_queries',
    });
    const savedDataSource =
      await this.dataSourceRepository.createDataSourceWithDefaultGroup(
        dataSource,
        defaultGroup,
      );

    return this.dataSourceService.buildDetailResponse(savedDataSource);
  }
}
