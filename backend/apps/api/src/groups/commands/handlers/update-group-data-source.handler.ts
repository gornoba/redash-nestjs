import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateGroupDataSourceCommand } from '../update-group-data-source.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(UpdateGroupDataSourceCommand)
export class UpdateGroupDataSourceHandler implements ICommandHandler<UpdateGroupDataSourceCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: UpdateGroupDataSourceCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    const relation = await this.groupsRepository.getDataSourceGroup(
      command.groupId,
      command.dataSourceId,
    );

    if (!relation) {
      throw new BadRequestException('Group data source relation not found.');
    }

    relation.viewOnly = command.payload.view_only;
    await this.groupsRepository.saveDataSourceGroup(relation);

    const [group, dataSources] = await Promise.all([
      this.groupsRepository.getGroupById(
        command.currentUser.orgId,
        command.groupId,
      ),
      this.groupsRepository.getGroupDataSources(command.groupId),
    ]);

    return {
      group: this.groupsService.serializeGroup(
        group,
        await this.groupsService.getMemberCount(group),
      ),
      data_sources: dataSources.map((item) => ({
        id: item.dataSource.id,
        name: item.dataSource.name,
        type: item.dataSource.type,
        view_only: item.viewOnly,
        created_at: item.dataSource.createdAt.toISOString(),
      })),
    };
  }
}
