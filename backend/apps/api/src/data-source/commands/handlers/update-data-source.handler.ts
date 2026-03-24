import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateDataSourceCommand } from '../update-data-source.command';
import { DataSourceRepository } from '../../repositories/data-source.repository';
import { DataSourceService } from '../../services/data-source.service';

@CommandHandler(UpdateDataSourceCommand)
export class UpdateDataSourceHandler implements ICommandHandler<UpdateDataSourceCommand> {
  constructor(
    private readonly dataSourceRepository: DataSourceRepository,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async execute(command: UpdateDataSourceCommand) {
    const dataSource = await this.dataSourceRepository.getDataSourceById(
      command.user.orgId,
      command.dataSourceId,
    );
    const definition = this.dataSourceService.getDefinitionOrThrow(
      command.payload.type,
    );
    const existingOptions = this.dataSourceService.parseOptions(
      dataSource.encryptedOptions,
    );
    const name = command.payload.name.trim();

    if (!name) {
      throw new BadRequestException('데이터 소스 이름을 입력해주세요.');
    }

    await this.dataSourceService.ensureUniqueName(
      command.user.orgId,
      name,
      dataSource.id,
    );

    dataSource.name = name;
    dataSource.type = command.payload.type;
    dataSource.encryptedOptions = this.dataSourceService.serializeOptions(
      // 수정 시 masked secret 을 그대로 보내는 클라이언트를 허용해야 해서
      // 기존 암호화 옵션을 함께 전달해 보존 여부를 결정한다.
      this.dataSourceService.normalizeOptions(
        definition,
        command.payload.options,
        existingOptions,
      ),
    );

    const savedDataSource =
      await this.dataSourceRepository.saveDataSource(dataSource);

    return this.dataSourceService.buildDetailResponse(savedDataSource);
  }
}
