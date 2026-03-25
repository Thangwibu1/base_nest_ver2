import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'example-2s' })
export class Example2Entity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
}

