import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DataSourceEntity } from './data-source.entity';
import { GroupEntity } from './group.entity';

@Entity({ name: 'data_source_groups' })
export class DataSourceGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'data_source_id', type: 'integer' })
  dataSourceId: number;

  @ManyToOne(() => DataSourceEntity)
  @JoinColumn({ name: 'data_source_id' })
  dataSource: DataSourceEntity;

  @Column({ name: 'group_id', type: 'integer' })
  groupId: number;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id' })
  group: GroupEntity;

  @Column({ name: 'view_only', type: 'boolean', default: false })
  viewOnly: boolean;
}
