import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';

import { hashPassword } from '@app/common/utils/password.util';
import { GroupEntity } from '@app/database/entities/group.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { GROUP_PERMISSION_OPTIONS } from '../../groups/groups.constants';
import type { CreateSetupDto } from '../dto/create-setup.dto';

@Injectable()
export class SetupRepository {
  private readonly defaultPermissions = [...GROUP_PERMISSION_OPTIONS];

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getSetupState() {
    const organizationsCount =
      await this.entityManager.count(OrganizationEntity);

    return {
      isSetupRequired: organizationsCount === 0,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    };
  }

  async createSetup(payload: CreateSetupDto) {
    return this.entityManager.transaction(async (transaction) => {
      const organization = transaction.create(OrganizationEntity, {
        name: payload.orgName,
        slug: 'default',
        settings: {},
      });

      const savedOrganization = await transaction.save(organization);

      const adminGroup = transaction.create(GroupEntity, {
        orgId: savedOrganization.id,
        type: 'builtin',
        name: 'admin',
        permissions: ['admin', 'super_admin'],
      });

      const defaultGroup = transaction.create(GroupEntity, {
        orgId: savedOrganization.id,
        type: 'builtin',
        name: 'default',
        permissions: this.defaultPermissions,
      });

      const savedAdminGroup = await transaction.save(adminGroup);
      const savedDefaultGroup = await transaction.save(defaultGroup);

      const user = transaction.create(UserEntity, {
        orgId: savedOrganization.id,
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash: await hashPassword(payload.password),
        groupIds: [savedAdminGroup.id, savedDefaultGroup.id],
        apiKey: randomBytes(20).toString('hex'),
        profileImageUrl: null,
        disabledAt: null,
        details: {
          is_invitation_pending: false,
          is_email_verified: true,
          securityNotifications: payload.securityNotifications,
          newsletter: payload.newsletter,
        },
      });

      const savedUser = await transaction.save(user);

      return {
        organization: {
          id: savedOrganization.id,
          name: savedOrganization.name,
          slug: savedOrganization.slug,
        },
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
        },
      };
    });
  }
}
