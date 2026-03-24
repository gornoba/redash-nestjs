import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OrganizationEntity } from './organization.entity';

@Index('data_sources_org_id_name', ['orgId', 'name'])
@Entity({ name: 'data_sources' })
export class DataSourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ name: 'encrypted_options', type: 'bytea' })
  encryptedOptions: string | Buffer;

  @Column({
    name: 'queue_name',
    type: 'varchar',
    length: 255,
    default: 'queries',
  })
  queueName: string;

  @Column({
    name: 'scheduled_queue_name',
    type: 'varchar',
    length: 255,
    default: 'scheduled_queries',
  })
  scheduledQueueName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
