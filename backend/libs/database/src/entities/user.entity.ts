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

@Index('IDX_users_org_id_email', ['orgId', 'email'], { unique: true })
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 320 })
  name: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({
    name: 'profile_image_url',
    type: 'varchar',
    length: 320,
    nullable: true,
  })
  profileImageUrl: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  passwordHash: string | null;

  @Column('integer', {
    name: 'groups',
    array: true,
    nullable: true,
  })
  groupIds: number[];

  @Column({ name: 'api_key', type: 'varchar', length: 40, unique: true })
  apiKey: string;

  @Column({ name: 'disabled_at', type: 'timestamptz', nullable: true })
  disabledAt: Date | null;

  @Column({ type: 'json', nullable: true, default: () => "'{}'" })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
