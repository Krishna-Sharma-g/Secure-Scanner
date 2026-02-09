import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Scan } from '../entities/scan.entity';
import { ScanFile } from '../entities/scan-file.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { Project } from '../entities/project.entity';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ScanEventsGateway } from './scan-events.gateway';
import { ScanEventsService } from './scan-events.service';
import { ScanEventsProcessor } from './scan-events.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Scan, ScanFile, Vulnerability, Project]),
    BullModule.registerQueue({ name: 'scan-events' }),
  ],
  controllers: [ScansController],
  providers: [ScansService, ScanEventsGateway, ScanEventsService, ScanEventsProcessor],
})
export class ScansModule {}
