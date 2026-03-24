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

import { DashboardEntity } from './dashboard.entity';
import { VisualizationEntity } from './visualization.entity';

@Index('IDX_widgets_dashboard_id', ['dashboardId'])
@Entity({ name: 'widgets' })
export class WidgetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'visualization_id', type: 'integer', nullable: true })
  visualizationId: number | null;

  @ManyToOne(() => VisualizationEntity, { nullable: true })
  @JoinColumn({ name: 'visualization_id' })
  visualization: VisualizationEntity | null;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'integer' })
  width: number;

  @Column({ type: 'text' })
  options: string;

  @Column({ name: 'dashboard_id', type: 'integer' })
  dashboardId: number;

  @ManyToOne(() => DashboardEntity)
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: DashboardEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
