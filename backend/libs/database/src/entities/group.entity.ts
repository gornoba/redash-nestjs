import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OrganizationEntity } from './organization.entity';

@Entity({ name: 'groups' })
export class GroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 255, default: 'regular' })
  type: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column('varchar', {
    array: true,
    length: 255,
    nullable: true,
  })
  permissions: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
