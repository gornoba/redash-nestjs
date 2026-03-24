import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';

import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { NotificationDestinationEntity } from '@app/database/entities/notification-destination.entity';

@Injectable()
export class DestinationsRepository {
  constructor(
    @InjectRepository(NotificationDestinationEntity)
    private readonly destinationRepository: Repository<NotificationDestinationEntity>,
    @InjectRepository(AlertSubscriptionEntity)
    private readonly alertSubscriptionRepository: Repository<AlertSubscriptionEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async getDestinations(orgId: number) {
    return this.destinationRepository.find({
      select: { id: true, name: true, type: true },
      where: { orgId },
      order: { id: 'ASC' },
    });
  }

  async getDestinationById(orgId: number, destinationId: number) {
    const destination = await this.destinationRepository.findOne({
      select: { id: true, name: true, type: true, encryptedOptions: true },
      where: { id: destinationId, orgId },
    });

    if (!destination) {
      throw new NotFoundException('알림 대상을 찾을 수 없습니다.');
    }

    return destination;
  }

  async findByName(orgId: number, name: string, excludeId?: number) {
    return this.destinationRepository.findOne({
      select: { id: true },
      where: {
        orgId,
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
  }

  createDestination(data: Partial<NotificationDestinationEntity>) {
    return this.destinationRepository.create(data);
  }

  async saveDestination(destination: NotificationDestinationEntity) {
    return this.destinationRepository.save(destination);
  }

  async deleteDestination(orgId: number, destinationId: number) {
    return this.entityManager.transaction(async (transaction) => {
      await transaction.update(
        AlertSubscriptionEntity,
        { destinationId },
        { destinationId: null },
      );

      await transaction.delete(NotificationDestinationEntity, {
        id: destinationId,
        orgId,
      });
    });
  }
}
