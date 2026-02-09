import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto, @Request() req: any) {
    return this.projectsService.addMember(id, req.user.id, dto);
  }

  @Get(':id/members')
  listMembers(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.listMembers(id, req.user.id);
  }
}
