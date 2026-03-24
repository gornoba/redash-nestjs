import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';

import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { isUserEmailVerified } from '../utils/user-details';
import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';

interface CurrentUserContext {
  messages: string[];
  organization: OrganizationEntity;
  permissions: string[];
  roles: string[];
  user: UserEntity;
}

@Injectable()
export class CurrentUserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  async getCurrentUserContextById(userId: number): Promise<CurrentUserContext> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        disabledAt: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('활성 사용자를 찾을 수 없습니다.');
    }

    return this.buildUserContext(user);
  }

  async getCurrentUserContext(): Promise<CurrentUserContext> {
    const user = await this.userRepository.findOne({
      where: {
        disabledAt: IsNull(),
      },
      order: {
        id: 'ASC',
      },
    });

    if (!user) {
      throw new NotFoundException('활성 사용자를 찾을 수 없습니다.');
    }

    return this.buildUserContext(user);
  }

  async getAuthenticatedUserById(userId: number): Promise<AuthenticatedUser> {
    const context = await this.getCurrentUserContextById(userId);

    return {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      orgId: context.organization.id,
      orgSlug: context.organization.slug,
      groupIds: context.user.groupIds ?? [],
      roles: context.roles,
      permissions: context.permissions,
      profileImageUrl: this.getProfileImageUrl(context.user),
      isEmailVerified: isUserEmailVerified(context.user.details),
    };
  }

  private async buildUserContext(
    user: UserEntity,
  ): Promise<CurrentUserContext> {
    const organization = await this.organizationRepository.findOneBy({
      id: user.orgId,
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    const groups = user.groupIds?.length
      ? await this.groupRepository.find({
          where: user.groupIds.map((id) => ({ id, orgId: user.orgId })),
        })
      : [];

    const permissions = [
      ...new Set(groups.flatMap((group) => group.permissions ?? [])),
    ];
    const roles = permissions.includes('admin') ? ['admin'] : ['user'];
    const messages = isUserEmailVerified(user.details)
      ? []
      : ['email-not-verified'];

    return {
      user,
      organization,
      permissions,
      roles,
      messages,
    };
  }

  getProfileImageUrl(user: UserEntity) {
    if (user.profileImageUrl) {
      return user.profileImageUrl;
    }

    if (!user.email) {
      return '';
    }

    const emailHash = createHash('md5')
      .update(user.email.toLowerCase())
      .digest('hex');

    return `https://www.gravatar.com/avatar/${emailHash}?s=40&d=identicon`;
  }
}
