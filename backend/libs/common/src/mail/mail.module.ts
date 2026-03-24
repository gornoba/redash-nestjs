import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MAIL_TRANSPORTER } from './mail.constants';
import { MailService } from './services/mail.service';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORTER,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const provider = (
          configService.get<string>('MAIL_PROVIDER') ?? 'disabled'
        ).toLowerCase();

        if (provider === 'disabled') {
          return null;
        }

        const transporter =
          provider === 'gmail'
            ? nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: configService.getOrThrow<string>('MAIL_GMAIL_USER'),
                  pass: configService.getOrThrow<string>(
                    'MAIL_GMAIL_APP_PASSWORD',
                  ),
                },
              })
            : nodemailer.createTransport({
                host: `email-smtp.${configService.get<string>('AWS_REGION') ?? 'ap-northeast-2'}.amazonaws.com`,
                port: 587,
                secure: false,
                auth: {
                  user: configService.getOrThrow<string>('EMAIL_AWS_USER'),
                  pass: configService.getOrThrow<string>('EMAIL_AWS_PASSWORD'),
                },
              });

        const verified = await transporter.verify().catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'unknown error';

          throw new InternalServerErrorException(
            `메일 전송 환경 설정에 실패했습니다: ${message}`,
          );
        });

        if (!verified) {
          throw new InternalServerErrorException(
            '메일 전송 환경 설정에 실패했습니다.(verify false)',
          );
        }

        return transporter;
      },
    },
    MailService,
  ],
  exports: [MAIL_TRANSPORTER, MailService],
})
export class MailModule {}
