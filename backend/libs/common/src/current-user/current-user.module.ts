import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { CurrentUserService } from './current-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, GroupEntity, OrganizationEntity]),
  ],
  providers: [CurrentUserService],
  exports: [CurrentUserService],
})
export class CurrentUserModule {}
