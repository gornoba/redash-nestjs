import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { pseudoJsonTransformer } from '../transformers/pseudo-json.transformer';
import { DataSourceEntity } from './data-source.entity';
import { OrganizationEntity } from './organization.entity';

@Index('IDX_query_results_query_hash', ['queryHash'])
@Entity({ name: 'query_results' })
export class QueryResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ name: 'data_source_id', type: 'integer' })
  dataSourceId: number;

  @ManyToOne(() => DataSourceEntity)
  @JoinColumn({ name: 'data_source_id' })
  dataSource: DataSourceEntity;

  @Column({ name: 'query_hash', type: 'varchar', length: 32 })
  queryHash: string;

  @Column({ name: 'query', type: 'text' })
  queryText: string;

  @Column({
    name: 'data',
    type: 'text',
    transformer: pseudoJsonTransformer,
  })
  data: unknown;

  @Column({ type: 'double precision' })
  runtime: number;

  @Column({ name: 'retrieved_at', type: 'timestamptz' })
  retrievedAt: Date;
}
