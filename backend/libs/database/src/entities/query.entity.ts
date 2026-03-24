import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { pseudoJsonTransformer } from '../transformers/pseudo-json.transformer';
import { DataSourceEntity } from './data-source.entity';
import { OrganizationEntity } from './organization.entity';
import { QueryResultEntity } from './query-result.entity';
import { UserEntity } from './user.entity';
import { VisualizationEntity } from './visualization.entity';

@Index('IDX_queries_is_archived', ['isArchived'])
@Index('IDX_queries_is_draft', ['isDraft'])
@Entity({ name: 'queries' })
export class QueryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ name: 'data_source_id', type: 'integer', nullable: true })
  dataSourceId: number | null;

  @ManyToOne(() => DataSourceEntity, { nullable: true })
  @JoinColumn({ name: 'data_source_id' })
  dataSource: DataSourceEntity | null;

  @Column({ name: 'latest_query_data_id', type: 'integer', nullable: true })
  latestQueryDataId: number | null;

  @ManyToOne(() => QueryResultEntity, { nullable: true })
  @JoinColumn({ name: 'latest_query_data_id' })
  latestQueryData: QueryResultEntity | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 4096, nullable: true })
  description: string | null;

  @Column({ name: 'query', type: 'text' })
  queryText: string;

  @Column({ name: 'query_hash', type: 'varchar', length: 32 })
  queryHash: string;

  @Column({ name: 'api_key', type: 'varchar', length: 40 })
  apiKey: string;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'last_modified_by_id', type: 'integer', nullable: true })
  lastModifiedById: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'last_modified_by_id' })
  lastModifiedBy: UserEntity | null;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft: boolean;

  @Column({
    type: 'text',
    nullable: true,
    transformer: pseudoJsonTransformer,
  })
  schedule: Record<string, unknown> | null;

  @Column({ name: 'schedule_failures', type: 'integer', default: 0 })
  scheduleFailures: number;

  @Column({
    type: 'text',
    default: '{}',
    transformer: pseudoJsonTransformer,
  })
  options: Record<string, unknown>;

  @Column({ name: 'search_vector', type: 'tsvector', nullable: true })
  searchVector: string | null;

  @Column('text', {
    name: 'tags',
    array: true,
    nullable: true,
  })
  tags: string[] | null;

  @OneToMany(() => VisualizationEntity, (visualization) => visualization.query)
  visualizations: VisualizationEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
