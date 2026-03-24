import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { pseudoJsonTransformer } from '../transformers/pseudo-json.transformer';
import { UserEntity } from './user.entity';

@Entity({ name: 'changes' })
export class ChangeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'object_type', type: 'varchar', length: 255 })
  objectType: string;

  @Column({ name: 'object_id', type: 'integer' })
  objectId: number;

  @Column({ name: 'object_version', type: 'integer', default: 0 })
  objectVersion: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({
    name: 'change',
    type: 'text',
    transformer: pseudoJsonTransformer,
  })
  change: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
