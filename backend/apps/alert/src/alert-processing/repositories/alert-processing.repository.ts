import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';

@Injectable()
export class AlertProcessingRepository {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(AlertSubscriptionEntity)
    private readonly alertSubscriptionRepository: Repository<AlertSubscriptionEntity>,
  ) {}

  getAlertsForQuery(queryId: number) {
    return this.alertRepository.find({
      where: { queryId },
      relations: {
        query: {
          latestQueryData: true,
        },
        user: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  saveAlert(alert: AlertEntity) {
    return this.alertRepository.save(alert);
  }

  getSubscriptionsForAlert(alertId: number) {
    return this.alertSubscriptionRepository.find({
      where: { alertId },
      relations: {
        destination: true,
        user: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async getSubscriptionForDispatch(alertId: number, subscriptionId: number) {
    const subscription = await this.alertSubscriptionRepository.findOne({
      where: {
        alertId,
        id: subscriptionId,
      },
      relations: {
        alert: {
          query: {
            latestQueryData: true,
          },
          user: true,
        },
        destination: true,
        user: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('알림 구독을 찾을 수 없습니다.');
    }

    return subscription;
  }
}
