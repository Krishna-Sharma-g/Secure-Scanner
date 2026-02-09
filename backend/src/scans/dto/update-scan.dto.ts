import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateScanDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  total_files?: number;

  @IsOptional()
  @IsInt()
  files_processed?: number;

  @IsOptional()
  @IsInt()
  duration_seconds?: number;
}
