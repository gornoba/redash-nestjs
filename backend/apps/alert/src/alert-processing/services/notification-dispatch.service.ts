import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailService } from '@app/common/mail/services/mail.service';
import type { NotificationDispatchJobPayload } from '@app/common/queue/queue.constants';
import {
  decryptJsonValue,
  normalizeEncryptedPayload,
} from '@app/common/utils/crypto.util';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertProcessingRepository } from '../repositories/alert-processing.repository';

type AlertState = NotificationDispatchJobPayload['state'];
type DestinationOptions = Record<string, unknown>;

interface NotificationTemplateContext {
  alertCondition: string;
  alertName: string;
  alertStatus: string;
  alertThreshold: string;
  alertUrl: string;
  customBody: string | null;
  customSubject: string | null;
  queryName: string;
  queryResultCols: string;
  queryResultRows: string;
  queryResultValue: string;
  queryUrl: string;
  replacements: TemplateReplacements;
  state: AlertState;
}

interface TemplateReplacements {
  ALERT_CONDITION: string;
  ALERT_NAME: string;
  ALERT_STATUS: string;
  ALERT_THRESHOLD: string;
  ALERT_URL: string;
  QUERY_NAME: string;
  QUERY_RESULT_COLS: string;
  QUERY_RESULT_ROWS: string;
  QUERY_RESULT_VALUE: string;
  QUERY_URL: string;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly alertProcessingRepository: AlertProcessingRepository,
  ) {}

  async dispatch(payload: NotificationDispatchJobPayload) {
    const subscription =
      await this.alertProcessingRepository.getSubscriptionForDispatch(
        payload.alertId,
        payload.subscriptionId,
      );
    const context = this.buildTemplateContext(subscription, payload.state);

    if (!subscription.destination) {
      await this.sendEmailToRecipients(
        [subscription.user.email],
        undefined,
        context,
      );
      return;
    }

    const destination = subscription.destination;
    const options = this.parseOptions(destination.encryptedOptions);

    switch (destination.type) {
      case 'discord':
        await this.sendDiscord(options, context);
        return;
      case 'email':
        await this.sendEmailToRecipients(
          this.parseEmailRecipients(options.addresses),
          this.getStringValue(options.subject_template) || undefined,
          context,
        );
        return;
      case 'slack':
        await this.sendSlack(options, context);
        return;
      case 'slack_bot':
        await this.sendSlackBot(options, context);
        return;
      case 'telegram':
        await this.sendTelegram(options, context);
        return;
      default:
        this.logger.warn(
          `지원하지 않는 알림 대상 타입입니다: ${destination.type}`,
        );
    }
  }

  private async sendEmailToRecipients(
    recipients: string[],
    subjectTemplate: string | undefined,
    context: NotificationTemplateContext,
  ) {
    const nextRecipients = recipients
      .map((recipient) => recipient.trim())
      .filter((recipient) => recipient.length > 0);

    if (!nextRecipients.length) {
      this.logger.warn('수신 이메일 주소가 없어 메일 발송을 건너뜁니다.');
      return;
    }

    const subject =
      context.customSubject ??
      this.renderDestinationTemplate(subjectTemplate, context.replacements) ??
      this.buildDefaultSubject(context);
    const html = this.buildEmailHtml(context);
    const text = this.buildEmailText(context);

    await this.mailService.sendMail({
      html,
      subject,
      text,
      to: nextRecipients,
    });
  }

  private async sendSlack(
    options: DestinationOptions,
    context: NotificationTemplateContext,
  ) {
    const url = this.getRequiredStringValue(options.url, 'Slack Webhook URL');
    const payload = this.buildSlackMessagePayload(context);

    await this.postJson(url, payload);
  }

  private async sendSlackBot(
    options: DestinationOptions,
    context: NotificationTemplateContext,
  ) {
    const botToken = this.getRequiredStringValue(
      options.bot_token,
      'Bot Token',
    );
    const channel = this.getRequiredStringValue(options.channel, 'Channel');
    const payload = this.buildSlackMessagePayload(context);
    payload.channel = channel;

    this.assignSlackIdentity(payload, options);
    this.assignOptionalString(payload, 'username', options.username);

    await this.postSlackApi(
      'https://slack.com/api/chat.postMessage',
      botToken,
      payload,
    );
  }

  private buildSlackMessagePayload(
    context: NotificationTemplateContext,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      attachments: [
        {
          color: context.state === 'triggered' ? '#c0392b' : '#27ae60',
          fields: [
            {
              short: true,
              title: 'Query',
              value: context.queryUrl,
            },
            {
              short: true,
              title: 'Alert',
              value: context.alertUrl,
            },
          ],
          text:
            context.customSubject ??
            (context.state === 'triggered'
              ? `${context.alertName} just triggered`
              : `${context.alertName} went back to normal`),
        },
      ],
    };

    if (context.customBody) {
      (payload.attachments as Array<Record<string, unknown>>)[0].fields = [
        ...((payload.attachments as Array<Record<string, unknown>>)[0]
          .fields as Array<Record<string, unknown>>),
        {
          short: false,
          title: 'Description',
          value: context.customBody,
        },
      ];
    }

    return payload;
  }

  private assignSlackIdentity(
    target: Record<string, unknown>,
    options: DestinationOptions,
  ) {
    const iconUrl = this.getStringValue(options.icon_url);
    const iconEmoji = this.getStringValue(options.icon_emoji);

    if (iconUrl) {
      target.icon_url = iconUrl;
      return;
    }

    if (iconEmoji) {
      target.icon_emoji = iconEmoji;
    }
  }

  private async sendDiscord(
    options: DestinationOptions,
    context: NotificationTemplateContext,
  ) {
    const url = this.getRequiredStringValue(options.url, 'Discord Webhook URL');
    await this.syncDiscordWebhookIdentity(url, options);

    const payload: Record<string, unknown> = {
      content: this.buildWebhookMessage(context),
    };

    this.assignOptionalString(payload, 'avatar_url', options.avatar_url);
    this.assignOptionalString(payload, 'username', options.username);

    await this.postJson(url, payload);
  }

  private async syncDiscordWebhookIdentity(
    url: string,
    options: DestinationOptions,
  ) {
    const username = this.getStringValue(options.username);
    const avatarUrl = this.getStringValue(options.avatar_url);

    if (!username && !avatarUrl) {
      return;
    }

    const payload: Record<string, unknown> = {};

    if (username) {
      payload.name = username;
    }

    if (avatarUrl) {
      const avatar = await this.fetchImageAsDataUri(avatarUrl);

      if (avatar) {
        payload.avatar = avatar;
      }
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      await this.patchJson(url, payload);
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? `Discord webhook 프로필 업데이트에 실패했습니다: ${error.message}`
          : 'Discord webhook 프로필 업데이트에 실패했습니다.',
      );
    }
  }

  private async sendTelegram(
    options: DestinationOptions,
    context: NotificationTemplateContext,
  ) {
    const botToken = this.getRequiredStringValue(
      options.bot_token,
      'Bot Token',
    );
    const chatId = this.getRequiredStringValue(options.chat_id, 'Chat ID');
    const parseMode = this.getStringValue(options.parse_mode);
    const messageThreadId = this.getStringValue(options.message_thread_id);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: this.buildTelegramMessage(context, parseMode),
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (messageThreadId) {
      payload.message_thread_id = messageThreadId;
    }

    await this.postJson(url, payload);
  }

  private buildTemplateContext(
    subscription: AlertSubscriptionEntity,
    state: AlertState,
  ): NotificationTemplateContext {
    const alert = subscription.alert;
    const query = alert.query;
    const alertOptions = this.getObjectValue(alert.options);
    const baseUrl = this.getRedashBaseUrl();
    const alertUrl = `${baseUrl}/alerts/${alert.id}`;
    const queryUrl = `${baseUrl}/queries/${query.id}`;
    const queryData = this.getObjectValue(query.latestQueryData?.data);
    const rows = this.getArrayValue(queryData.rows);
    const columns = this.getArrayValue(queryData.columns);
    const firstRow = rows[0];
    const columnName = this.getStringValue(alertOptions.column);
    const firstRowRecord =
      firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)
        ? (firstRow as Record<string, unknown>)
        : null;
    const resultValue =
      firstRowRecord &&
      columnName &&
      Object.prototype.hasOwnProperty.call(firstRowRecord, columnName)
        ? firstRowRecord[columnName]
        : null;
    const replacements: TemplateReplacements = {
      ALERT_CONDITION: this.getStringValue(alertOptions.op),
      ALERT_NAME: alert.name,
      ALERT_STATUS: state.toUpperCase(),
      ALERT_THRESHOLD:
        alertOptions.value === undefined || alertOptions.value === null
          ? ''
          : this.stringifyTemplateValue(alertOptions.value),
      ALERT_URL: alertUrl,
      QUERY_NAME: query.name,
      QUERY_RESULT_COLS: JSON.stringify(columns),
      QUERY_RESULT_ROWS: JSON.stringify(rows),
      QUERY_RESULT_VALUE:
        resultValue === undefined || resultValue === null
          ? ''
          : this.stringifyTemplateValue(resultValue),
      QUERY_URL: queryUrl,
    };

    return {
      alertCondition: replacements.ALERT_CONDITION,
      alertName: replacements.ALERT_NAME,
      alertStatus: replacements.ALERT_STATUS,
      alertThreshold: replacements.ALERT_THRESHOLD,
      alertUrl,
      customBody: this.renderTemplate(
        this.getStringValue(alertOptions.custom_body) ||
          this.getStringValue(alertOptions.template),
        replacements,
      ),
      customSubject: this.renderTemplate(
        this.getStringValue(alertOptions.custom_subject),
        replacements,
      ),
      queryName: replacements.QUERY_NAME,
      queryResultCols: replacements.QUERY_RESULT_COLS,
      queryResultRows: replacements.QUERY_RESULT_ROWS,
      queryResultValue: replacements.QUERY_RESULT_VALUE,
      queryUrl,
      replacements,
      state,
    };
  }

  private buildDefaultSubject(context: NotificationTemplateContext) {
    return `(${context.alertStatus}) ${context.alertName}`;
  }

  private buildEmailHtml(context: NotificationTemplateContext) {
    if (context.customBody) {
      return context.customBody;
    }

    return this.escapeHtml(this.buildEmailText(context)).replace(
      /\n/g,
      '<br />',
    );
  }

  private buildEmailText(context: NotificationTemplateContext) {
    if (context.customBody) {
      return context.customBody;
    }

    if (context.state === 'triggered') {
      return [
        `${context.alertName} 알림이 발생했습니다.`,
        `조건: ${context.queryResultValue} ${context.alertCondition} ${context.alertThreshold}`,
        `Alert: ${context.alertUrl}`,
        `Query: ${context.queryUrl}`,
      ].join('\n');
    }

    return [
      `${context.alertName} 알림이 정상 상태로 돌아왔습니다.`,
      `Alert: ${context.alertUrl}`,
      `Query: ${context.queryUrl}`,
    ].join('\n');
  }

  private buildWebhookMessage(context: NotificationTemplateContext) {
    const headline =
      context.customSubject ??
      (context.state === 'triggered'
        ? `${context.alertName} just triggered`
        : `${context.alertName} went back to normal`);

    if (!context.customBody) {
      return `${headline}\n${context.alertUrl}\n${context.queryUrl}`;
    }

    return `${headline}\n${context.customBody}\n${context.alertUrl}\n${context.queryUrl}`;
  }

  private renderTemplate(template: string, replacements: TemplateReplacements) {
    if (!template) {
      return null;
    }

    return template.replace(/{{\s*([A-Z_]+)\s*}}/g, (_, token: string) => {
      if (Object.prototype.hasOwnProperty.call(replacements, token)) {
        return replacements[token as keyof TemplateReplacements];
      }

      return '';
    });
  }

  private renderDestinationTemplate(
    template: string | undefined,
    replacements: TemplateReplacements,
  ) {
    if (!template) {
      return null;
    }

    const legacyReplaced = template
      .replace(/\{alert_name\}/gi, replacements.ALERT_NAME)
      .replace(/\{state\}/gi, replacements.ALERT_STATUS)
      .replace(/\{query_name\}/gi, replacements.QUERY_NAME)
      .replace(/\{query_result_value\}/gi, replacements.QUERY_RESULT_VALUE);

    return this.renderTemplate(legacyReplaced, replacements);
  }

  private parseEmailRecipients(value: unknown) {
    return this.getStringValue(value)
      .split(',')
      .map((recipient) => recipient.trim())
      .filter((recipient) => recipient.length > 0);
  }

  private parseOptions(
    value: string | Buffer | null | undefined,
  ): DestinationOptions {
    const normalizedValue = normalizeEncryptedPayload(value);

    if (!normalizedValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(normalizedValue) as unknown;

      return this.getObjectValue(parsed);
    } catch {
      return decryptJsonValue<DestinationOptions>(normalizedValue) ?? {};
    }
  }

  private getRedashBaseUrl() {
    return (
      this.configService.get<string>('REDASH_BASE_URL') ??
      'http://localhost:3000'
    );
  }

  private getObjectValue(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private getArrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private getStringValue(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private stringifyTemplateValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    return JSON.stringify(value) ?? '';
  }

  private buildTelegramMessage(
    context: NotificationTemplateContext,
    parseMode: string,
  ) {
    if (parseMode === 'HTML') {
      return this.buildTelegramHtmlMessage(context);
    }

    if (parseMode === 'Markdown') {
      return this.buildTelegramMarkdownMessage(context);
    }

    return this.buildWebhookMessage(context);
  }

  private buildTelegramHtmlMessage(context: NotificationTemplateContext) {
    const title = this.escapeTelegramHtml(
      context.customSubject ??
        (context.state === 'triggered'
          ? `${context.alertName} just triggered`
          : `${context.alertName} went back to normal`),
    );
    const body = context.customBody
      ? `\n${this.escapeTelegramHtml(context.customBody)}`
      : '';

    return [
      `<b>${title}</b>${body}`,
      `<a href="${this.escapeHtmlAttribute(context.alertUrl)}">Alert</a>`,
      `<a href="${this.escapeHtmlAttribute(context.queryUrl)}">Query</a>`,
    ].join('\n');
  }

  private buildTelegramMarkdownMessage(context: NotificationTemplateContext) {
    const title = this.escapeTelegramMarkdown(
      context.customSubject ??
        (context.state === 'triggered'
          ? `${context.alertName} just triggered`
          : `${context.alertName} went back to normal`),
    );
    const body = context.customBody
      ? `\n${this.escapeTelegramMarkdown(context.customBody)}`
      : '';

    return [
      `*${title}*${body}`,
      `[Alert](${context.alertUrl})`,
      `[Query](${context.queryUrl})`,
    ].join('\n');
  }

  private getRequiredStringValue(value: unknown, label: string) {
    const normalized = this.getStringValue(value);

    if (!normalized) {
      throw new Error(`${label} 값이 비어 있습니다.`);
    }

    return normalized;
  }

  private assignOptionalString(
    target: Record<string, unknown>,
    key: string,
    value: unknown,
  ) {
    const normalized = this.getStringValue(value);

    if (normalized) {
      target[key] = normalized;
    }
  }

  private async postJson(url: string, payload: Record<string, unknown>) {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`알림 전송에 실패했습니다. status=${response.status}`);
    }
  }

  private async postSlackApi(
    url: string,
    botToken: string,
    payload: Record<string, unknown>,
  ) {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      method: 'POST',
    });

    const responseBody = (await response.json().catch(() => null)) as {
      error?: string;
      ok?: boolean;
    } | null;

    if (!response.ok || !responseBody?.ok) {
      throw new Error(
        `Slack Bot 알림 전송에 실패했습니다. error=${responseBody?.error ?? response.status}`,
      );
    }
  }

  private async patchJson(url: string, payload: Record<string, unknown>) {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(
        `알림 대상 수정에 실패했습니다. status=${response.status}`,
      );
    }
  }

  private async fetchImageAsDataUri(url: string) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`status=${response.status}`);
      }

      const contentType =
        response.headers.get('content-type')?.trim() || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? `Discord avatar 이미지를 읽지 못했습니다: ${error.message}`
          : 'Discord avatar 이미지를 읽지 못했습니다.',
      );

      return null;
    }
  }

  private escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeHtmlAttribute(text: string) {
    return this.escapeHtml(text);
  }

  private escapeTelegramHtml(text: string) {
    return this.escapeHtml(text);
  }

  private escapeTelegramMarkdown(text: string) {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }
}
