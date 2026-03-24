import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { MailService } from '@app/common/mail/services/mail.service';
import { hashPassword } from '@app/common/utils/password.util';
import {
  isUserInvitationPending,
  toUserDetailsRecord,
} from '@app/common/utils/user-details';
import type { AcceptLinkRequestDto } from '../dto/users.dto';
import { UsersRepository } from '../repositories/users.repository';

interface InviteTokenPayload {
  sub: number;
  type: 'invite' | 'reset';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  async acceptLink(
    token: string,
    mode: 'invite' | 'reset',
    payload: AcceptLinkRequestDto,
  ) {
    const user = await this.getUserFromToken(token, mode);
    const passwordHash = await hashPassword(payload.password);

    await this.usersRepository.acceptInvitation(user.id, passwordHash);

    return {
      message:
        mode === 'invite'
          ? '계정이 활성화되었습니다. 로그인해 주세요.'
          : '비밀번호가 변경되었습니다. 로그인해 주세요.',
    };
  }

  async getUserFromToken(token: string, mode: 'invite' | 'reset') {
    let payload: InviteTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<InviteTokenPayload>(token, {
        secret: this.getInviteSecret(),
      });
    } catch {
      throw new BadRequestException('유효하지 않거나 만료된 초대 링크입니다.');
    }

    if (payload.type !== mode) {
      throw new BadRequestException('유효하지 않은 링크 토큰입니다.');
    }

    const user = await this.usersRepository.findUserById(payload.sub);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (mode === 'invite' && !isUserInvitationPending(user.details)) {
      throw new BadRequestException(
        '이미 수락된 초대 링크입니다. 비밀번호 재설정을 이용해주세요.',
      );
    }

    return user;
  }

  async buildLink(userId: number, type: 'invite' | 'reset') {
    const token = await this.jwtService.signAsync(
      { sub: userId, type },
      {
        secret: this.getInviteSecret(),
        expiresIn: this.getInviteExpiresIn() as never,
      },
    );

    return `${this.getRedashBaseUrl()}/${type === 'invite' ? 'invite' : 'reset'}/${token}`;
  }

  private getInviteExpiresIn() {
    return '1h';
  }

  private getInviteSecret() {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'new-redash-local-secret'
    );
  }

  private getRedashBaseUrl() {
    return (
      this.configService.get<string>('REDASH_BASE_URL') ??
      'http://localhost:3000'
    );
  }

  canManageUser(currentUser: AuthenticatedUser, user: { id: number }) {
    return currentUser.roles.includes('admin') || currentUser.id === user.id;
  }

  serializeUser(
    user: {
      id: number;
      name: string;
      email: string;
      profileImageUrl: string | null;
      disabledAt: Date | null;
      details: Record<string, unknown> | null;
      createdAt: Date;
      groupIds: number[];
      apiKey: string;
    },
    groups: Array<{ id: number; name: string }>,
    options: {
      includeApiKey?: boolean;
      inviteLink?: string;
      resetLink?: string;
    },
  ) {
    const details = toUserDetailsRecord(user.details);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile_image_url: this.currentUserService.getProfileImageUrl(
        user as Parameters<
          typeof this.currentUserService.getProfileImageUrl
        >[0],
      ),
      api_key: options.includeApiKey ? user.apiKey : null,
      group_ids: user.groupIds ?? [],
      groups,
      is_disabled: Boolean(user.disabledAt),
      is_invitation_pending: isUserInvitationPending(user.details),
      created_at: user.createdAt.toISOString(),
      active_at:
        typeof details.active_at === 'string' ? details.active_at : null,
      ...(options.inviteLink ? { invite_link: options.inviteLink } : {}),
      ...(options.resetLink ? { reset_link: options.resetLink } : {}),
    };
  }

  serializeUserSummary(
    user: {
      id: number;
      name: string;
      email: string;
      profileImageUrl: string | null;
      disabledAt: Date | null;
      details: Record<string, unknown> | null;
      createdAt: Date;
    },
    groups: Array<{ id: number; name: string }>,
    options: {
      inviteLink?: string;
      resetLink?: string;
    },
  ) {
    const details = toUserDetailsRecord(user.details);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile_image_url: this.currentUserService.getProfileImageUrl(
        user as Parameters<
          typeof this.currentUserService.getProfileImageUrl
        >[0],
      ),
      is_disabled: Boolean(user.disabledAt),
      is_invitation_pending: isUserInvitationPending(user.details),
      groups,
      created_at: user.createdAt.toISOString(),
      active_at:
        typeof details.active_at === 'string' ? details.active_at : null,
      ...(options.inviteLink ? { invite_link: options.inviteLink } : {}),
      ...(options.resetLink ? { reset_link: options.resetLink } : {}),
    };
  }

  async sendInvitationEmail(params: {
    inviteLink: string;
    invitedUserEmail: string;
    invitedUserName: string;
    inviterEmail: string;
    inviterName: string;
    organizationName: string;
  }) {
    if (!this.mailService.isConfigured()) {
      return false;
    }

    try {
      await this.mailService.sendMail({
        to: [params.invitedUserEmail],
        subject: `${params.inviterName} invited you to join Redash`,
        text: [
          `Hi ${params.invitedUserName},`,
          '',
          `${params.inviterName} (${params.inviterEmail}) invited you to join the Redash account of ${params.organizationName}.`,
          '',
          'Setup Account:',
          params.inviteLink,
          '',
          `Your sign-in email is: ${params.invitedUserEmail}`,
          `Your Redash account is: ${this.getRedashBaseUrl()}`,
        ].join('\n'),
        html: this.renderTransactionalEmail({
          title: `${params.inviterName} invited you to join Redash`,
          intro: `Hi ${params.invitedUserName},`,
          description: `${params.inviterName} (${params.inviterEmail}) invited you to join the Redash account of ${params.organizationName}.`,
          buttonLabel: 'Setup Account',
          buttonUrl: params.inviteLink,
          metaLines: [
            `Your sign-in email is: ${params.invitedUserEmail}`,
            `Your Redash account is: ${this.getRedashBaseUrl()}`,
          ],
        }),
      });

      return true;
    } catch {
      return false;
    }
  }

  async sendResetPasswordEmail(params: {
    resetLink: string;
    userEmail: string;
    userName: string;
  }) {
    if (!this.mailService.isConfigured()) {
      return false;
    }

    try {
      await this.mailService.sendMail({
        to: [params.userEmail],
        subject: 'Reset your password',
        text: [
          `Hi ${params.userName},`,
          '',
          'Use the link below to reset your Redash password:',
          params.resetLink,
        ].join('\n'),
        html: this.renderTransactionalEmail({
          title: 'Reset your password',
          intro: `Hi ${params.userName},`,
          description: 'Use the button below to reset your Redash password.',
          buttonLabel: 'Reset Password',
          buttonUrl: params.resetLink,
        }),
      });

      return true;
    } catch {
      return false;
    }
  }

  private renderTransactionalEmail(params: {
    title: string;
    intro: string;
    description: string;
    buttonLabel: string;
    buttonUrl: string;
    metaLines?: string[];
  }) {
    const metaBlock = (params.metaLines ?? [])
      .map(
        (line) =>
          `<p style="margin:0 0 8px;color:#525252;font-size:14px;line-height:1.6;">${this.escapeHtml(line)}</p>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${this.escapeHtml(params.title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f5f7fa;font-family:Helvetica,Arial,sans-serif;color:#525252;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-collapse:separate;">
      <tr>
        <td style="padding:40px 60px;border:1px solid #dddddd;border-radius:2px;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <h1 style="margin:0 0 20px;color:#282F33;font-size:26px;line-height:1.3;font-weight:600;">${this.escapeHtml(params.title)}</h1>
          <p style="margin:0 0 17px;font-size:15px;line-height:1.6;">${this.escapeHtml(params.intro)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${this.escapeHtml(params.description)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:17px 0 20px;border-collapse:collapse;">
            <tr>
              <td style="background:#0071b2;border-radius:3px;padding:12px 35px;">
                <a href="${this.escapeHtml(params.buttonUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${this.escapeHtml(params.buttonLabel)}</a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 17px;font-size:14px;line-height:1.6;color:#525252;">
            <small>You may copy/paste this link into your browser: ${this.escapeHtml(params.buttonUrl)}</small>
          </p>
          ${metaBlock}
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
