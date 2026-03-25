import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'example-3s' })
export class Example3Entity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
}

