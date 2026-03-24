import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { pseudoJsonTransformer } from '../transformers/pseudo-json.transformer';
import { QueryEntity } from './query.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'alerts' })
export class AlertEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'query_id', type: 'integer' })
  queryId: number;

  @ManyToOne(() => QueryEntity)
  @JoinColumn({ name: 'query_id' })
  query: QueryEntity;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({
    type: 'text',
    transformer: pseudoJsonTransformer,
  })
  options: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, default: 'unknown' })
  state: string;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  rearm: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
