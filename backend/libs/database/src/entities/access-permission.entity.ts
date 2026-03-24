import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from './user.entity';

@Entity({ name: 'access_permissions' })
export class AccessPermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'object_type', type: 'varchar', length: 255 })
  objectType: string;

  @Column({ name: 'object_id', type: 'integer' })
  objectId: number;

  @Column({ name: 'access_type', type: 'varchar', length: 255 })
  accessType: string;

  @Column({ name: 'grantor_id', type: 'integer' })
  grantorId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'grantor_id' })
  grantor: UserEntity;

  @Column({ name: 'grantee_id', type: 'integer' })
  granteeId: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'grantee_id' })
  grantee: UserEntity;
}
