import { IsString, IsNotEmpty } from 'class-validator';

export class Example3Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

