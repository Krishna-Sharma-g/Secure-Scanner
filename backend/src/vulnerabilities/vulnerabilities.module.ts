import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vulnerability } from '../entities/vulnerability.entity';
import { VulnerabilitiesController } from './vulnerabilities.controller';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vulnerability])],
  controllers: [VulnerabilitiesController],
  providers: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
