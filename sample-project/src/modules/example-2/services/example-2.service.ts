import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class Example2Service {
  async findOne(id: string) {
    if (!id) {
      throw new NotFoundException('Example2 id is required');
    }

    return {
      id,
      message: 'Example2 fetched successfully',
    };
  }
}
