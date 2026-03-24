import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { SetupController } from './controllers/setup.controller';
import { SetupRepository } from './repositories/setup.repository';
import { SetupService } from './services/setup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, GroupEntity, UserEntity]),
  ],
  controllers: [SetupController],
  providers: [SetupService, SetupRepository],
})
export class SetupModule {}
