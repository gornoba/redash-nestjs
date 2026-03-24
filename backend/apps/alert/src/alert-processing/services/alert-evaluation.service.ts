import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
  NOTIFICATION_DISPATCH_JOB,
  NOTIFICATION_DISPATCH_QUEUE,
  type NotificationDispatchJobPayload,
} from '@app/common/queue/queue.constants';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { AlertProcessingRepository } from '../repositories/alert-processing.repository';

type AlertState = NotificationDispatchJobPayload['state'];
type AlertOperator = (
  value: number | string,
  threshold: number | string,
) => boolean;
type QueryResultRows = Array<Record<string, unknown>>;

const UNKNOWN_STATE: AlertState = 'unknown';
const OK_STATE: AlertState = 'ok';
const TRIGGERED_STATE: AlertState = 'triggered';

const ALERT_OPERATORS: Record<string, AlertOperator> = {
  '>': (value, threshold) => value > threshold,
  '>=': (value, threshold) => value >= threshold,
  '<': (value, threshold) => value < threshold,
  '<=': (value, threshold) => value <= threshold,
  '==': (value, threshold) => value == threshold,
  '!=': (value, threshold) => value != threshold,
  'greater than': (value, threshold) => value > threshold,
  'less than': (value, threshold) => value < threshold,
  equals: (value, threshold) => value == threshold,
};

interface AlertQueryData {
  rows?: QueryResultRows;
}

@Injectable()
export class AlertEvaluationService {
  constructor(
    @InjectQueue(NOTIFICATION_DISPATCH_QUEUE)
    private readonly notificationDispatchQueue: Queue,
    private readonly alertProcessingRepository: AlertProcessingRepository,
  ) {}

  async processEvaluation(queryId: number) {
    const alerts =
      await this.alertProcessingRepository.getAlertsForQuery(queryId);

    for (const alert of alerts) {
      await this.evaluateAndQueueNotifications(alert);
    }
  }

  private async evaluateAndQueueNotifications(alert: AlertEntity) {
    const nextState = this.evaluateAlert(alert);

    if (!this.shouldNotify(alert, nextState)) {
      return;
    }

    const previousState = this.normalizeState(alert.state);

    alert.state = nextState;
    alert.lastTriggeredAt = new Date();

    await this.alertProcessingRepository.saveAlert(alert);

    if (previousState === UNKNOWN_STATE && nextState === OK_STATE) {
      return;
    }

    if (this.isMuted(alert)) {
      return;
    }

    const subscriptions =
      await this.alertProcessingRepository.getSubscriptionsForAlert(alert.id);

    for (const subscription of subscriptions) {
      await this.notificationDispatchQueue.add(
        NOTIFICATION_DISPATCH_JOB,
        {
          alertId: alert.id,
          state: nextState,
          subscriptionId: subscription.id,
        },
        {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    }
  }

  private evaluateAlert(alert: AlertEntity): AlertState {
    const options = this.getAlertOptions(alert);
    const column = this.getStringOption(options.column);
    const operator =
      ALERT_OPERATORS[this.getStringOption(options.op)] ?? (() => false);
    const data = alert.query?.latestQueryData?.data;
    const rows = this.getRows(data);
    const firstRow = rows[0];

    if (!column || !firstRow || !this.hasOwn(firstRow, column)) {
      return UNKNOWN_STATE;
    }

    const value = firstRow[column];

    return this.getNextState(operator, value, options.value);
  }

  private getNextState(
    operator: AlertOperator,
    value: unknown,
    threshold: unknown,
  ): AlertState {
    let comparableValue: number | string;
    let comparableThreshold: number | string;

    if (typeof value === 'boolean') {
      comparableValue = String(value).toLowerCase();
      comparableThreshold = String(threshold).toLowerCase();
    } else {
      const numericValue = this.toComparableNumber(value);

      if (numericValue !== null) {
        const numericThreshold = this.toComparableNumber(threshold);

        if (numericThreshold === null) {
          return UNKNOWN_STATE;
        }

        comparableValue = numericValue;
        comparableThreshold = numericThreshold;
      } else {
        comparableValue = String(value);
        comparableThreshold = String(threshold);
      }
    }

    return operator(comparableValue, comparableThreshold)
      ? TRIGGERED_STATE
      : OK_STATE;
  }

  private shouldNotify(alert: AlertEntity, nextState: AlertState) {
    const currentState = this.normalizeState(alert.state);

    if (nextState !== currentState) {
      return true;
    }

    if (
      currentState !== TRIGGERED_STATE ||
      !alert.rearm ||
      !alert.lastTriggeredAt
    ) {
      return false;
    }

    return alert.lastTriggeredAt.getTime() + alert.rearm * 1000 < Date.now();
  }

  private isMuted(alert: AlertEntity) {
    return Boolean(this.getAlertOptions(alert).muted);
  }

  private getAlertOptions(alert: AlertEntity) {
    const options = alert.options;

    if (options && typeof options === 'object' && !Array.isArray(options)) {
      return options;
    }

    return {};
  }

  private normalizeState(state: string): AlertState {
    if (
      state === OK_STATE ||
      state === TRIGGERED_STATE ||
      state === UNKNOWN_STATE
    ) {
      return state;
    }

    return UNKNOWN_STATE;
  }

  private getRows(data: unknown): QueryResultRows {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }

    const rows = (data as AlertQueryData).rows;

    return Array.isArray(rows) ? rows : [];
  }

  private getStringOption(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toComparableNumber(value: unknown) {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isNaN(parsed) ? null : parsed;
  }

  private hasOwn(record: Record<string, unknown>, key: string) {
    return Object.prototype.hasOwnProperty.call(record, key);
  }
}
