import { LegacyTimestampSubscriber } from './legacy-timestamp.subscriber';

describe('LegacyTimestampSubscriber', () => {
  const subscriber = new LegacyTimestampSubscriber();

  it('fills missing createdAt and updatedAt on insert', () => {
    const entity = {
      createdAt: null,
      updatedAt: null,
    };

    subscriber.beforeInsert({
      entity,
    } as never);

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });

  it('keeps existing createdAt and refreshes updatedAt on update', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');
    const entity = {
      createdAt,
      updatedAt,
    };

    subscriber.beforeUpdate({
      entity,
    } as never);

    expect(entity.createdAt).toBe(createdAt);
    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).not.toBe(updatedAt);
  });
});
