import { Body, Controller, Get, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdateVulnerabilityStatusDto } from './dto/update-vulnerability-status.dto';
import { VulnerabilitiesService } from './vulnerabilities.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/vulnerabilities')
export class VulnerabilitiesController {
  constructor(private readonly vulnerabilitiesService: VulnerabilitiesService) {}

  @Get()
  findAll(@Request() req: any, @Query('project_id') projectId?: string) {
    return this.vulnerabilitiesService.findAllForUser(req.user.id, projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.vulnerabilitiesService.findOneForUser(id, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVulnerabilityStatusDto, @Request() req: any) {
    return this.vulnerabilitiesService.updateStatusForUser(id, dto, req.user.id);
  }
}
