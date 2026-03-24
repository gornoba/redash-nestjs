import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AlertEntity } from './alert.entity';
import { NotificationDestinationEntity } from './notification-destination.entity';
import { UserEntity } from './user.entity';

@Index(
  'alert_subscriptions_destination_id_alert_id',
  ['destinationId', 'alertId'],
  {
    unique: true,
  },
)
@Entity({ name: 'alert_subscriptions' })
export class AlertSubscriptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'destination_id', type: 'integer', nullable: true })
  destinationId: number | null;

  @ManyToOne(() => NotificationDestinationEntity, { nullable: true })
  @JoinColumn({ name: 'destination_id' })
  destination: NotificationDestinationEntity | null;

  @Column({ name: 'alert_id', type: 'integer' })
  alertId: number;

  @ManyToOne(() => AlertEntity)
  @JoinColumn({ name: 'alert_id' })
  alert: AlertEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
