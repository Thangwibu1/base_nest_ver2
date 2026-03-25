import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'users' })
@Unique(['email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 180 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
