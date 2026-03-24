import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';

import type { SendMailOptions } from '../interfaces/send-mail-options.interface';
import { MAIL_TRANSPORTER } from '../mail.constants';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: Transporter | null,
    private readonly configService: ConfigService,
  ) {}

  isConfigured() {
    return Boolean(this.transporter && this.getFromAddress());
  }

  async sendMail(payload: SendMailOptions) {
    if (!this.transporter || !this.isConfigured()) {
      throw new ServiceUnavailableException(
        '메일 전송 설정이 완료되지 않았습니다.',
      );
    }

    await this.transporter.sendMail({
      from: this.getFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  private getFromAddress() {
    return (
      this.configService.get<string>('MAIL_FROM') ??
      this.configService.get<string>('MAIL_DEFAULT_SENDER') ??
      undefined
    );
  }
}
