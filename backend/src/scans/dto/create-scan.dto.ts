import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateScanDto {
  @IsUUID()
  project_id!: string;

  @IsOptional()
  @IsObject()
  scan_config?: Record<string, unknown>;
}
