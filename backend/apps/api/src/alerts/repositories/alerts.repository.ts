import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import type { AlertListQueryDto } from '../dto/alerts.dto';

type AlertListRow = {
  alert_createdAt: Date | string;
  alert_id: number | string;
  alert_muted: boolean | string | null;
  alert_name: string;
  alert_state: string;
  alert_updatedAt: Date | string;
  user_id: number | string;
  user_name: string;
};

export type AlertListSummary = {
  createdAt: Date;
  id: number;
  muted: boolean;
  name: string;
  state: string;
  updatedAt: Date;
  userId: number;
  userName: string;
};

type AlertListOrderDefinition = {
  orderBy: string;
};

export function getAlertListOrderDefinition(
  normalizedOrder: string,
): AlertListOrderDefinition | null {
  switch (normalizedOrder) {
    case 'muted':
      return {
        orderBy: 'alert_muted',
      };
    case 'name':
      return {
        orderBy: 'LOWER(alert.name)',
      };
    case 'state':
      return {
        orderBy: 'LOWER(alert.state)',
      };
    case 'updated_at':
      return {
        orderBy: 'alert.updatedAt',
      };
    case 'created_at':
      return {
        orderBy: 'alert.createdAt',
      };
    default:
      return null;
  }
}

@Injectable()
export class AlertsRepository {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(AlertSubscriptionEntity)
    private readonly alertSubscriptionRepository: Repository<AlertSubscriptionEntity>,
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(NotificationDestinationEntity)
    private readonly notificationDestinationRepository: Repository<NotificationDestinationEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
  ) {}

  async getAlerts(user: AuthenticatedUser, params: AlertListQueryDto) {
    const queryBuilder = await this.createAccessibleAlertsQueryBuilder(user);

    if (!queryBuilder) {
      return [];
    }

    this.applyFilters(queryBuilder, params);
    this.applyOrdering(queryBuilder, params.order);

    const rows = await queryBuilder.getRawMany<AlertListRow>();

    return rows.map((row) => ({
      createdAt: this.parseDateValue(row.alert_createdAt),
      id: Number(row.alert_id),
      muted: this.parseBooleanValue(row.alert_muted),
      name: row.alert_name,
      state: row.alert_state,
      updatedAt: this.parseDateValue(row.alert_updatedAt),
      userId: Number(row.user_id),
      userName: row.user_name,
    }));
  }

  async getAlertById(user: AuthenticatedUser, alertId: number) {
    const queryBuilder =
      await this.createAccessibleAlertDetailQueryBuilder(user);

    if (!queryBuilder) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    const alert = await queryBuilder
      .andWhere('alert.id = :alertId', { alertId })
      .getOne();

    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return alert;
  }

  getAlertMutableContextById(user: AuthenticatedUser, alertId: number) {
    return this.getAccessibleAlertContextById(user, alertId, true);
  }

  getAlertPermissionContextById(user: AuthenticatedUser, alertId: number) {
    return this.getAccessibleAlertContextById(user, alertId, false);
  }

  async getAccessibleQueryById(user: AuthenticatedUser, queryId: number) {
    const queryBuilder = this.queryRepository
      .createQueryBuilder('query')
      .select(['query.id'])
      .where('query.id = :queryId', { queryId })
      .andWhere('query.org_id = :orgId', { orgId: user.orgId });

    if (!user.roles.includes('admin')) {
      const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
        user,
        'view_query',
      );

      if (!accessibleDataSourceIds.length) {
        throw new NotFoundException('쿼리를 찾을 수 없습니다.');
      }

      queryBuilder.andWhere('query.data_source_id IN (:...dataSourceIds)', {
        dataSourceIds: accessibleDataSourceIds,
      });
    }

    const query = await queryBuilder.getOne();

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    return query;
  }

  async getDestinationById(orgId: number, destinationId: number) {
    const destination = await this.notificationDestinationRepository.findOne({
      select: {
        id: true,
      },
      where: {
        id: destinationId,
        orgId,
      },
    });

    if (!destination) {
      throw new NotFoundException('알림 대상을 찾을 수 없습니다.');
    }

    return destination;
  }

  createAlert(data: Partial<AlertEntity>) {
    return this.alertRepository.create(data);
  }

  saveAlert(alert: AlertEntity) {
    return this.alertRepository.save(alert);
  }

  async deleteAlert(alertId: number) {
    await this.alertSubscriptionRepository.delete({ alertId });
    return this.alertRepository.delete({ id: alertId });
  }

  async getSubscriptions(user: AuthenticatedUser, alertId: number) {
    await this.getAccessibleAlertContextById(user, alertId, false);

    return this.createSubscriptionQueryBuilder(alertId)
      .orderBy('subscription.id', 'ASC')
      .getMany();
  }

  createSubscription(data: Partial<AlertSubscriptionEntity>) {
    return this.alertSubscriptionRepository.create(data);
  }

  saveSubscription(subscription: AlertSubscriptionEntity) {
    return this.alertSubscriptionRepository.save(subscription);
  }

  async getSubscriptionById(alertId: number, subscriptionId: number) {
    const subscription = await this.createSubscriptionQueryBuilder(alertId)
      .andWhere('subscription.id = :subscriptionId', { subscriptionId })
      .getOne();

    if (!subscription) {
      throw new NotFoundException('알림 구독을 찾을 수 없습니다.');
    }

    return subscription;
  }

  deleteSubscription(subscriptionId: number) {
    return this.alertSubscriptionRepository.delete({ id: subscriptionId });
  }

  private async createAccessibleAlertsQueryBuilder(user: AuthenticatedUser) {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .select('alert.id', 'alert_id')
      .addSelect('alert.name', 'alert_name')
      .addSelect('alert.state', 'alert_state')
      .addSelect('alert.updatedAt', 'alert_updatedAt')
      .addSelect('alert.createdAt', 'alert_createdAt')
      .addSelect(
        "COALESCE((alert.options::jsonb ->> 'muted')::boolean, false)",
        'alert_muted',
      )
      .addSelect('user.id', 'user_id')
      .addSelect('user.name', 'user_name')
      .innerJoin('alert.query', 'query')
      .innerJoin('alert.user', 'user')
      .where('query.org_id = :orgId', { orgId: user.orgId });

    if (user.roles.includes('admin')) {
      return queryBuilder;
    }

    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      'view_query',
    );

    if (!accessibleDataSourceIds.length) {
      return null;
    }

    queryBuilder.andWhere('query.data_source_id IN (:...dataSourceIds)', {
      dataSourceIds: accessibleDataSourceIds,
    });

    return queryBuilder;
  }

  private async getAccessibleAlertContextById(
    user: AuthenticatedUser,
    alertId: number,
    includeOptions: boolean,
  ) {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .select(['alert.id', 'alert.userId'])
      .innerJoin('alert.query', 'query')
      .where('query.org_id = :orgId', { orgId: user.orgId })
      .andWhere('alert.id = :alertId', { alertId });

    if (includeOptions) {
      queryBuilder.addSelect('alert.options');
    }

    if (!user.roles.includes('admin')) {
      const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
        user,
        'view_query',
      );

      if (!accessibleDataSourceIds.length) {
        throw new NotFoundException('알림을 찾을 수 없습니다.');
      }

      queryBuilder.andWhere('query.data_source_id IN (:...dataSourceIds)', {
        dataSourceIds: accessibleDataSourceIds,
      });
    }

    const alert = await queryBuilder.getOne();

    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return alert;
  }

  private async createAccessibleAlertDetailQueryBuilder(
    user: AuthenticatedUser,
  ) {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .select([
        'alert.id',
        'alert.name',
        'alert.options',
        'alert.state',
        'alert.lastTriggeredAt',
        'alert.updatedAt',
        'alert.createdAt',
        'alert.rearm',
        'alert.userId',
      ])
      .innerJoin('alert.query', 'query')
      .addSelect(['query.id', 'query.name', 'query.schedule'])
      .where('query.org_id = :orgId', { orgId: user.orgId });

    if (user.roles.includes('admin')) {
      return queryBuilder;
    }

    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      'view_query',
    );

    if (!accessibleDataSourceIds.length) {
      return null;
    }

    queryBuilder.andWhere('query.data_source_id IN (:...dataSourceIds)', {
      dataSourceIds: accessibleDataSourceIds,
    });

    return queryBuilder;
  }

  private createSubscriptionQueryBuilder(alertId: number) {
    return this.alertSubscriptionRepository
      .createQueryBuilder('subscription')
      .select(['subscription.id', 'subscription.userId'])
      .innerJoin('subscription.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .leftJoin('subscription.destination', 'destination')
      .addSelect(['destination.id', 'destination.name', 'destination.type'])
      .where('subscription.alertId = :alertId', { alertId });
  }

  private parseBooleanValue(value: boolean | string | null) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true' || value === 't';
    }

    return false;
  }

  private parseDateValue(value: Date | string) {
    return value instanceof Date ? value : new Date(value);
  }

  private applyFilters(
    queryBuilder: ReturnType<Repository<AlertEntity>['createQueryBuilder']>,
    params: AlertListQueryDto,
  ) {
    const searchTerm = params.q?.trim();

    if (!searchTerm) {
      return;
    }

    queryBuilder.andWhere('alert.name ILIKE :searchPattern', {
      searchPattern: `%${searchTerm}%`,
    });
  }

  private applyOrdering(
    queryBuilder: ReturnType<Repository<AlertEntity>['createQueryBuilder']>,
    order: AlertListQueryDto['order'],
  ) {
    if (!order) {
      queryBuilder.orderBy('alert.createdAt', 'DESC');
      return;
    }

    const direction = order.startsWith('-') ? 'DESC' : 'ASC';
    const normalizedOrder = order.replace(/^-/, '');
    const orderDefinition = getAlertListOrderDefinition(normalizedOrder);

    if (!orderDefinition) {
      queryBuilder.orderBy('alert.createdAt', 'DESC');
      return;
    }

    queryBuilder
      .orderBy(orderDefinition.orderBy, direction)
      .addOrderBy('alert.id', 'ASC');
  }

  private async getAccessibleDataSourceIds(
    user: AuthenticatedUser,
    permission: string,
  ) {
    if (user.roles.includes('admin')) {
      const rows = await this.dataSourceRepository.find({
        select: {
          id: true,
        },
        where: {
          orgId: user.orgId,
        },
      });

      return rows.map((dataSource) => dataSource.id);
    }

    if (!user.groupIds.length) {
      return [];
    }

    const rows = await this.dataSourceRepository
      .createQueryBuilder('data_source')
      .select('data_source.id', 'id')
      .distinct(true)
      .innerJoin(
        'data_source_groups',
        'data_source_group',
        'data_source_group.data_source_id = data_source.id',
      )
      .innerJoin(
        'groups',
        'access_group',
        'access_group.id = data_source_group.group_id AND access_group.org_id = data_source.org_id',
      )
      .where('data_source.org_id = :orgId', {
        orgId: user.orgId,
      })
      .andWhere('data_source_group.group_id IN (:...groupIds)', {
        groupIds: user.groupIds,
      })
      .andWhere(
        ':permission = ANY(COALESCE(access_group.permissions, ARRAY[]::varchar[]))',
        {
          permission,
        },
      )
      .getRawMany<{ id: number | string }>();

    return rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }
}
