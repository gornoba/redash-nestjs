import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { AddGroupDataSourceCommand } from '../add-group-data-source.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';

@CommandHandler(AddGroupDataSourceCommand)
export class AddGroupDataSourceHandler implements ICommandHandler<AddGroupDataSourceCommand> {
  constructor(
    private readonly groupsRepository: GroupsRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async execute(command: AddGroupDataSourceCommand) {
    this.groupsService.ensureAdmin(command.currentUser);

    await this.groupsRepository.getGroupById(
      command.currentUser.orgId,
      command.groupId,
    );
    await this.groupsRepository.getDataSourceById(
      command.currentUser.orgId,
      command.payload.data_source_id,
    );

    const existingRelation = await this.groupsRepository.getDataSourceGroup(
      command.groupId,
      command.payload.data_source_id,
    );

    if (!existingRelation) {
      const relation = this.groupsRepository.createDataSourceGroup({
        groupId: command.groupId,
        dataSourceId: command.payload.data_source_id,
        viewOnly: false,
      });
      await this.groupsRepository.saveDataSourceGroup(relation);
    }

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
