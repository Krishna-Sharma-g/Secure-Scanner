import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUrl()
  repository_url?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
