import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { MailService } from '@app/common/mail/services/mail.service';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import {
  DEFAULT_DATE_FORMAT_OPTIONS,
  DEFAULT_TIME_FORMAT_OPTIONS,
  normalizeOrganizationSettings,
} from '../../settings/settings.constants';

const DEFAULT_QUERY_REFRESH_INTERVALS = [
  60, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800,
  32400, 36000, 39600, 43200, 86400, 604800, 1209600, 2592000,
] as const;

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    private readonly mailService: MailService,
  ) {}

  async getSessionPayload(user: AuthenticatedUser) {
    /* settings만 사용하므로 필요한 컬럼만 로딩 */
    const organization = await this.organizationRepository.findOne({
      select: { id: true, settings: true },
      where: { id: user.orgId },
    });
    const organizationSettings = normalizeOrganizationSettings(
      organization?.settings,
    );
    const dateFormatList = Array.from(
      new Set([
        ...DEFAULT_DATE_FORMAT_OPTIONS,
        organizationSettings.date_format,
      ]),
    );
    const timeFormatList = Array.from(
      new Set([
        ...DEFAULT_TIME_FORMAT_OPTIONS,
        organizationSettings.time_format,
      ]),
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        groups: user.groupIds,
        roles: user.roles,
        permissions: user.permissions,
        profile_image_url: user.profileImageUrl,
      },
      messages: user.isEmailVerified ? [] : ['email-not-verified'],
      org_slug: user.orgSlug,
      client_config: {
        basePath: '/',
        pageSize: 25,
        allowScriptsInUserInput: false,
        dateFormat: organizationSettings.date_format,
        timeFormat: organizationSettings.time_format,
        timezone: organizationSettings.timezone,
        dateFormatList,
        timeFormatList,
        queryRefreshIntervals: [...DEFAULT_QUERY_REFRESH_INTERVALS],
        dateTimeFormat: `${organizationSettings.date_format} ${organizationSettings.time_format}`,
        mailSettingsMissing: !this.mailService.isConfigured(),
        settingsHomePath: user.roles.includes('admin')
          ? '/data_sources'
          : user.permissions.includes('list_users')
            ? '/users'
            : user.permissions.includes('create_query')
              ? '/query_snippets'
              : '/users/me',
      },
    };
  }
}
