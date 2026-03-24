import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { RemoveGroupDataSourceCommand } from '../remove-group-data-source.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(RemoveGroupDataSourceCommand)
export class RemoveGroupDataSourceHandler implements ICommandHandler<RemoveGroupDataSourceCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: RemoveGroupDataSourceCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    await this.groupsRepository.deleteDataSourceGroup(
      command.groupId,
      command.dataSourceId,
    );

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
