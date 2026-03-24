import {
  EventSubscriber,
  type EntitySubscriberInterface,
  type InsertEvent,
  type UpdateEvent,
} from 'typeorm';

type TimestampedEntity = {
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

@EventSubscriber()
export class LegacyTimestampSubscriber implements EntitySubscriberInterface<TimestampedEntity> {
  beforeInsert(event: InsertEvent<TimestampedEntity>) {
    if (!event.entity) {
      return;
    }

    const now = new Date();

    if ('createdAt' in event.entity && !event.entity.createdAt) {
      event.entity.createdAt = now;
    }

    if ('updatedAt' in event.entity && !event.entity.updatedAt) {
      event.entity.updatedAt = now;
    }
  }

  beforeUpdate(event: UpdateEvent<TimestampedEntity>) {
    if (!event.entity || !('updatedAt' in event.entity)) {
      return;
    }

    event.entity.updatedAt = new Date();
  }
}
