import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { toUserDetailsRecord } from '@app/common/utils/user-details';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class VerificationRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /** 이메일 인증 처리용 — 메일 발송에 필요한 최소 컬럼만 로딩, 이후 update()로 수정 */
  async findActiveUserById(userId: number) {
    const user = await this.userRepository.findOne({
      select: { id: true, name: true, email: true, details: true },
      where: {
        id: userId,
        disabledAt: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('활성 사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async markVerificationEmailRequested(userId: number) {
    const user = await this.findActiveUserById(userId);
    const details = toUserDetailsRecord(user.details);

    await this.userRepository.update(user.id, {
      details: {
        ...details,
        verification_email_requested_at: new Date().toISOString(),
      },
    });
  }

  async markEmailVerified(userId: number) {
    const user = await this.findActiveUserById(userId);
    const details = toUserDetailsRecord(user.details);

    await this.userRepository.update(user.id, {
      details: {
        ...details,
        is_email_verified: true,
      },
    });
  }
}
