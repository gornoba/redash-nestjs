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

@Index('IDX_dashboards_slug', ['slug'])
@Index('IDX_dashboards_is_archived', ['isArchived'])
@Index('IDX_dashboards_is_draft', ['isDraft'])
@Entity({ name: 'dashboards' })
export class DashboardEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  version: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 140 })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'text' })
  layout: string;

  @Column({
    name: 'dashboard_filters_enabled',
    type: 'boolean',
    default: false,
  })
  dashboardFiltersEnabled: boolean;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft: boolean;

  @Column('text', {
    name: 'tags',
    array: true,
    nullable: true,
  })
  tags: string[] | null;

  @Column({ type: 'json', default: () => "'{}'" })
  options: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
