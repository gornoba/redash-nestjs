import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { pseudoJsonTransformer } from '../transformers/pseudo-json.transformer';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;

  @Column({ type: 'varchar', length: 255 })
  action: string;

  @Column({ name: 'object_type', type: 'varchar', length: 255 })
  objectType: string;

  @Column({ name: 'object_id', type: 'varchar', length: 255, nullable: true })
  objectId: string | null;

  @Column({
    name: 'additional_properties',
    type: 'text',
    nullable: true,
    default: '{}',
    transformer: pseudoJsonTransformer,
  })
  additionalProperties: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
