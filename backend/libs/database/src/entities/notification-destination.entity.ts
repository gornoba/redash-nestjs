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
import { UserEntity } from './user.entity';

@Index('notification_destinations_org_id_name', ['orgId', 'name'], {
  unique: true,
})
@Entity({ name: 'notification_destinations' })
export class NotificationDestinationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'org_id', type: 'integer' })
  orgId: number;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'org_id' })
  organization: OrganizationEntity;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ name: 'encrypted_options', type: 'bytea' })
  encryptedOptions: string | Buffer;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
