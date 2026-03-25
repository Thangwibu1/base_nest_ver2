import { IsString, IsNotEmpty } from 'class-validator';

export class Example2Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

