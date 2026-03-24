import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrentUserModule } from '@app/common/current-user/current-user.module';
import { MailModule } from '@app/common/mail/mail.module';
import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AcceptLinkHandler } from './commands/handlers/accept-link.handler';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';
import { DisableUserHandler } from './commands/handlers/disable-user.handler';
import { EnableUserHandler } from './commands/handlers/enable-user.handler';
import { RegenerateApiKeyHandler } from './commands/handlers/regenerate-api-key.handler';
import { ResendInvitationHandler } from './commands/handlers/resend-invitation.handler';
import { SendPasswordResetHandler } from './commands/handlers/send-password-reset.handler';
import { UpdateUserHandler } from './commands/handlers/update-user.handler';
import { UsersController } from './controllers/users.controller';
import { GetLinkDetailsHandler } from './queries/handlers/get-link-details.handler';
import { GetUserHandler } from './queries/handlers/get-user.handler';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([UserEntity, GroupEntity, OrganizationEntity]),
    MailModule,
    AuthModule,
    CurrentUserModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    DisableUserHandler,
    EnableUserHandler,
    RegenerateApiKeyHandler,
    ResendInvitationHandler,
    SendPasswordResetHandler,
    AcceptLinkHandler,
    GetUserHandler,
    GetLinkDetailsHandler,
  ],
})
export class UsersModule {}
