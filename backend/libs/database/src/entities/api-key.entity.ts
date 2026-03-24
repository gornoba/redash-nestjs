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

import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';

@Index('IDX_api_keys_api_key', ['apiKey'])
@Index('api_keys_object_type_object_id', ['objectType', 'objectId'])
@Entity({ name: 'api_keys' })
export class ApiKeyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ name: 'api_key', type: 'varchar', length: 255 })
  apiKey: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'object_type', type: 'varchar', length: 255 })
  objectType: string;

  @Column({ name: 'object_id', type: 'integer' })
  objectId: number;

  @Column({ name: 'created_by_id', type: 'integer', nullable: true })
  createdById: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
