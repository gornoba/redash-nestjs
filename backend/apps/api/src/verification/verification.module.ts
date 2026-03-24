import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '@app/common/mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '@app/database/entities/user.entity';
import { VerificationController } from './controllers/verification.controller';
import { VerificationRepository } from './repositories/verification.repository';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), MailModule, AuthModule],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationRepository],
})
export class VerificationModule {}
