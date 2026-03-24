import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /** COUNT(*) 대신 EXISTS 패턴으로 조직 존재 여부만 확인 */
  async hasAnyOrganization() {
    const one = await this.organizationRepository.findOne({
      select: { id: true },
      where: {},
    });

    return one !== null;
  }

  /**
   * organization은 where 필터용으로만 사용하므로 leftJoin만 수행.
   * 로그인 검증·후처리에 필요한 컬럼만 select한다.
   */
  findActiveUserByEmail(email: string, orgSlug: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.name',
        'user.passwordHash',
        'user.details',
        'user.groupIds',
        'user.profileImageUrl',
        'user.orgId',
      ])
      .leftJoin('user.organization', 'org')
      .where('user.email = :email', { email })
      .andWhere('user.disabledAt IS NULL')
      .andWhere('org.slug = :orgSlug', { orgSlug })
      .getOne();
  }

  /**
   * save()는 select하지 않은 컬럼을 null로 덮어쓸 위험이 있으므로
   * 변경이 필요한 필드만 update()로 갱신한다.
   */
  updateUserLoginInfo(
    userId: number,
    data: {
      passwordHash?: string;
      details?: Record<string, unknown> | null;
    },
  ) {
    // TypeORM _QueryDeepPartialEntity 타입과 json 컬럼의 Record 타입 불일치로 단언 사용
    return this.userRepository.update(
      userId,
      data as Parameters<Repository<UserEntity>['update']>[1],
    );
  }
}
