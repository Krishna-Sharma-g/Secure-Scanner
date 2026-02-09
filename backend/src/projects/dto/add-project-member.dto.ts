import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ProjectRole } from '../../entities/project-member.entity';

export class AddProjectMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  role?: ProjectRole;
}
