import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateScanFileDto {
  @IsString()
  file_path!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  lines_of_code?: number;

  @IsOptional()
  @IsInt()
  vulnerability_count?: number;
}
