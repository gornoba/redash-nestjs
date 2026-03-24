import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { MailService } from '@app/common/mail/services/mail.service';
import { isUserEmailVerified } from '@app/common/utils/user-details';
import { VerificationRepository } from '../repositories/verification.repository';

@Injectable()
export class VerificationService {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async resendVerificationEmail(currentUser: AuthenticatedUser) {
    const user = await this.verificationRepository.findActiveUserById(
      currentUser.id,
    );

    if (!isUserEmailVerified(user.details)) {
      const token = await this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.getVerificationSecret(),
          expiresIn: this.getVerificationExpiresIn() as never,
        },
      );
      const verifyUrl = `${this.getRedashBaseUrl()}/verify/${token}`;

      await this.mailService.sendMail({
        to: [user.email],
        subject: `${user.name}, please verify your email address`,
        text: [
          `Hi ${user.name},`,
          '',
          `Please verify that ${user.email} is your correct email address by visiting the following link:`,
          '',
          verifyUrl,
          '',
          'Thank you.',
        ].join('\n'),
        html: [
          `<p>Hi ${user.name},</p>`,
          `<h2>Please verify that ${user.email} is your correct email address by visiting the following link:</h2>`,
          `<p><a href="${verifyUrl}" target="_blank" rel="noreferrer">Verify Address</a></p>`,
          `<p><small>You may copy/paste this link into your browser: ${verifyUrl}</small></p>`,
        ].join(''),
      });

      await this.verificationRepository.markVerificationEmailRequested(user.id);
    }

    return {
      message:
        'Please check your email inbox in order to verify your email address.',
    };
  }

  async verifyEmail(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(
        token,
        {
          secret: this.getVerificationSecret(),
        },
      );

      await this.verificationRepository.markEmailVerified(payload.sub);

      return {
        message: '이메일 인증이 완료되었습니다.',
      };
    } catch {
      throw new BadRequestException(
        '유효하지 않거나 만료된 이메일 인증 링크입니다.',
      );
    }
  }

  private getRedashBaseUrl() {
    return (
      this.configService.get<string>('REDASH_BASE_URL') ??
      'http://localhost:3000'
    );
  }

  private getVerificationExpiresIn() {
    return '1d';
  }

  private getVerificationSecret() {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'new-redash-local-secret'
    );
  }
}
