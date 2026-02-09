import { Body, Controller, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateScanFileDto } from './dto/create-scan-file.dto';
import { CreateVulnerabilityDto } from './dto/create-vulnerability.dto';
import { UpdateScanDto } from './dto/update-scan.dto';
import { CreateTestScanDto } from './dto/create-test-scan.dto';
import { ScansService } from './scans.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  create(@Body() dto: CreateScanDto, @Request() req: any) {
    return this.scansService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.scansService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.scansService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScanDto, @Request() req: any) {
    return this.scansService.update(id, dto, req.user.id);
  }

  @Post(':id/files')
  addFiles(@Param('id') id: string, @Body() files: CreateScanFileDto[], @Request() req: any) {
    return this.scansService.addFiles(id, files, req.user.id);
  }

  @Post(':id/vulnerabilities')
  addVulnerabilities(@Param('id') id: string, @Body() vulns: CreateVulnerabilityDto[], @Request() req: any) {
    return this.scansService.addVulnerabilities(id, vulns, req.user.id);
  }

  @Post('test')
  createTest(@Body() dto: CreateTestScanDto, @Request() req: any) {
    return this.scansService.createTestScan(dto, req.user.id);
  }
}
