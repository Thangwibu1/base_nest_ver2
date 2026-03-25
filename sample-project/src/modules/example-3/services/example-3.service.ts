import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class Example3Service {
  async findOne(id: string) {
    if (!id) {
      throw new NotFoundException('Example3 id is required');
    }

    return {
      id,
      message: 'Example3 fetched successfully',
    };
  }
}
