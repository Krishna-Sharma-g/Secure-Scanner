import { IsInt, IsOptional } from 'class-validator';

export class CreateTestScanDto {
  @IsOptional()
  @IsInt()
  files?: number;

  @IsOptional()
  @IsInt()
  vulnerabilities?: number;
}
