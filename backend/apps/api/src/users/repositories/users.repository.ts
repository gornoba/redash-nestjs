import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { EntityManager, Repository } from 'typeorm';

import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  /** 존재 확인용 — id만 로딩 */
  findUserByEmail(orgId: number, email: string) {
    return this.userRepository.findOne({
      select: { id: true },
      where: {
        orgId,
        email,
      },
    });
  }

  async getDefaultGroup(orgId: number) {
    const group = await this.groupRepository.findOne({
      select: { id: true, name: true },
      where: {
        orgId,
        type: 'builtin',
        name: 'default',
      },
    });

    if (!group) {
      throw new NotFoundException('기본 그룹을 찾을 수 없습니다.');
    }

    return group;
  }

  async createInvitedUser(params: {
    email: string;
    name: string;
    orgId: number;
    defaultGroupId: number;
  }) {
    return this.entityManager.transaction(async (transaction) => {
      const user = transaction.create(UserEntity, {
        orgId: params.orgId,
        name: params.name,
        email: params.email,
        passwordHash: null,
        groupIds: [params.defaultGroupId],
        apiKey: randomBytes(20).toString('hex'),
        profileImageUrl: null,
        disabledAt: null,
        details: {
          is_invitation_pending: true,
          is_email_verified: false,
        },
      });

      return transaction.save(user);
    });
  }

  findUserById(userId: number) {
    return this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
  }

  async getUserByIdAndOrg(userId: number, orgId: number) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        orgId,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  getGroupsByIds(orgId: number, groupIds: number[]) {
    if (groupIds.length === 0) {
      return [];
    }

    return this.groupRepository.find({
      select: { id: true, name: true },
      where: groupIds.map((id) => ({ id, orgId })),
      order: {
        name: 'ASC',
      },
    });
  }

  getAllGroups(orgId: number) {
    return this.groupRepository.find({
      select: { id: true, name: true },
      where: {
        orgId,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /** 초대 이메일에서 조직 이름만 사용 */
  async getOrganizationById(orgId: number) {
    const organization = await this.organizationRepository.findOne({
      select: { id: true, name: true },
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    return organization;
  }

  saveUser(user: UserEntity) {
    return this.userRepository.save(user);
  }

  deleteUser(user: UserEntity) {
    return this.userRepository.remove(user);
  }

  async acceptInvitation(userId: number, passwordHash: string) {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    user.passwordHash = passwordHash;
    user.details = {
      ...(user.details ?? {}),
      is_invitation_pending: false,
      is_email_verified: true,
    };

    return this.userRepository.save(user);
  }
}
