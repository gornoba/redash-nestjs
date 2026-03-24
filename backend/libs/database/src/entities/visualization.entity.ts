import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { QueryEntity } from './query.entity';

@Entity({ name: 'visualizations' })
export class VisualizationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ name: 'query_id', type: 'integer' })
  queryId: number;

  @ManyToOne(() => QueryEntity)
  @JoinColumn({ name: 'query_id' })
  query: QueryEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 4096, nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  options: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
