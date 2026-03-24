import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import type { AlertEntity } from '@app/database/entities/alert.entity';
import type { QueryEntity } from '@app/database/entities/query.entity';
import type {
  AlertListQueryDto,
  CreateAlertSubscriptionRequestDto,
  SaveAlertRequestDto,
} from '../dto/alerts.dto';
import {
  AlertsRepository,
  type AlertListSummary,
} from '../repositories/alerts.repository';

type AlertOptions = Record<string, unknown>;

@Injectable()
export class AlertsService {
  constructor(private readonly alertsRepository: AlertsRepository) {}

  async getAlerts(user: AuthenticatedUser, query: AlertListQueryDto) {
    const alerts = await this.alertsRepository.getAlerts(user, query);

    return alerts.map((alert) => this.serializeAlertListItem(alert));
  }

  async getAlert(user: AuthenticatedUser, alertId: number) {
    const alert = await this.alertsRepository.getAlertById(user, alertId);

    return this.serializeAlert(alert);
  }

  async createAlert(user: AuthenticatedUser, payload: SaveAlertRequestDto) {
    const name = payload.name.trim();

    if (!name) {
      throw new BadRequestException('알림 이름을 입력해주세요.');
    }

    this.validateAlertOptions(payload.options);

    const query = await this.alertsRepository.getAccessibleQueryById(
      user,
      payload.query_id,
    );
    const alert = this.alertsRepository.createAlert({
      name,
      options: payload.options,
      queryId: query.id,
      rearm: payload.rearm ?? null,
      state: 'unknown',
      userId: user.id,
    });

    const savedAlert = await this.alertsRepository.saveAlert(alert);
    const nextAlert = await this.alertsRepository.getAlertById(
      user,
      savedAlert.id,
    );

    return this.serializeAlert(nextAlert);
  }

  async updateAlert(
    user: AuthenticatedUser,
    alertId: number,
    payload: SaveAlertRequestDto,
  ) {
    const alert = await this.alertsRepository.getAlertMutableContextById(
      user,
      alertId,
    );

    this.ensureAdminOrOwner(user, alert.userId);

    const name = payload.name.trim();

    if (!name) {
      throw new BadRequestException('알림 이름을 입력해주세요.');
    }

    this.validateAlertOptions(payload.options);

    const query = await this.alertsRepository.getAccessibleQueryById(
      user,
      payload.query_id,
    );

    alert.name = name;
    alert.options = payload.options;
    alert.queryId = query.id;
    alert.rearm = payload.rearm ?? null;

    await this.alertsRepository.saveAlert(alert);

    const nextAlert = await this.alertsRepository.getAlertById(user, alertId);

    return this.serializeAlert(nextAlert);
  }

  async deleteAlert(user: AuthenticatedUser, alertId: number) {
    const alert = await this.alertsRepository.getAlertPermissionContextById(
      user,
      alertId,
    );

    this.ensureAdminOrOwner(user, alert.userId);

    await this.alertsRepository.deleteAlert(alert.id);
  }

  async muteAlert(user: AuthenticatedUser, alertId: number, muted: boolean) {
    const alert = await this.alertsRepository.getAlertMutableContextById(
      user,
      alertId,
    );

    this.ensureAdminOrOwner(user, alert.userId);

    alert.options = {
      ...this.normalizeOptions(alert.options),
      muted,
    };

    await this.alertsRepository.saveAlert(alert);
  }

  async getSubscriptions(user: AuthenticatedUser, alertId: number) {
    const subscriptions = await this.alertsRepository.getSubscriptions(
      user,
      alertId,
    );

    return subscriptions.map((subscription) =>
      this.serializeSubscription(subscription),
    );
  }

  async createSubscription(
    user: AuthenticatedUser,
    alertId: number,
    payload: CreateAlertSubscriptionRequestDto,
  ) {
    const alert = await this.alertsRepository.getAlertPermissionContextById(
      user,
      alertId,
    );

    let destination = null;

    if (payload.destination_id) {
      destination = await this.alertsRepository.getDestinationById(
        user.orgId,
        payload.destination_id,
      );
    }

    const subscription = this.alertsRepository.createSubscription({
      alertId: alert.id,
      destinationId: destination?.id ?? null,
      userId: user.id,
    });

    const savedSubscription =
      await this.alertsRepository.saveSubscription(subscription);
    const nextSubscription = await this.alertsRepository.getSubscriptionById(
      alert.id,
      savedSubscription.id,
    );

    return this.serializeSubscription(nextSubscription);
  }

  async deleteSubscription(
    user: AuthenticatedUser,
    alertId: number,
    subscriptionId: number,
  ) {
    await this.alertsRepository.getAlertPermissionContextById(user, alertId);
    const subscription = await this.alertsRepository.getSubscriptionById(
      alertId,
      subscriptionId,
    );

    this.ensureAdminOrOwner(user, subscription.userId);

    await this.alertsRepository.deleteSubscription(subscription.id);
  }

  private serializeAlertListItem(alert: AlertListSummary) {
    return {
      id: alert.id,
      name: alert.name,
      muted: alert.muted,
      state: alert.state,
      updated_at: alert.updatedAt.toISOString(),
      created_at: alert.createdAt.toISOString(),
      user: {
        id: alert.userId,
        name: alert.userName,
      },
    };
  }

  private serializeAlert(alert: AlertEntity) {
    return {
      id: alert.id,
      name: alert.name,
      options: this.normalizeOptions(alert.options),
      state: alert.state,
      last_triggered_at: alert.lastTriggeredAt?.toISOString() ?? null,
      updated_at: alert.updatedAt.toISOString(),
      created_at: alert.createdAt.toISOString(),
      rearm: alert.rearm,
      query: this.serializeQuery(alert.query),
      user: {
        id: alert.userId,
      },
    };
  }

  private serializeQuery(query: Pick<QueryEntity, 'id' | 'name' | 'schedule'>) {
    return {
      id: query.id,
      name: query.name,
      schedule: query.schedule,
    };
  }

  private serializeSubscription(subscription: AlertSubscriptionEntity) {
    return {
      id: subscription.id,
      user: {
        id: subscription.user.id,
        email: subscription.user.email,
      },
      ...(subscription.destination
        ? {
            destination: {
              id: subscription.destination.id,
              name: subscription.destination.name,
              type: subscription.destination.type,
            },
          }
        : {}),
    };
  }

  private normalizeOptions(options: unknown): AlertOptions {
    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);

    if (typeof options === 'string') {
      try {
        const parsedOptions = JSON.parse(options) as unknown;

        if (isPlainObject(parsedOptions)) {
          return parsedOptions as AlertOptions;
        }
      } catch {
        return {};
      }
    }

    if (isPlainObject(options)) {
      return options as AlertOptions;
    }

    return {};
  }

  private validateAlertOptions(options: Record<string, unknown>) {
    if (
      typeof options.column !== 'string' ||
      options.column.trim().length === 0 ||
      typeof options.op !== 'string' ||
      options.op.trim().length === 0 ||
      options.value === undefined ||
      options.value === null ||
      this.stringifyOptionValue(options.value).trim().length === 0
    ) {
      throw new BadRequestException(
        '알림 조건(column, op, value)을 모두 입력해주세요.',
      );
    }
  }

  private stringifyOptionValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    return JSON.stringify(value) ?? '';
  }

  private ensureAdminOrOwner(user: AuthenticatedUser, ownerId: number) {
    if (user.roles.includes('admin') || user.id === ownerId) {
      return;
    }

    throw new ForbiddenException('이 알림을 수정할 권한이 없습니다.');
  }
}
