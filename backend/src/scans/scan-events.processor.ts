import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ScanEventsGateway } from './scan-events.gateway';

@Processor('scan-events')
export class ScanEventsProcessor {
  constructor(private readonly gateway: ScanEventsGateway) {}

  @Process('progress')
  handleProgress(job: Job) {
    this.gateway.emitProgress(job.data);
  }

  @Process('vulnerability')
  handleVulnerability(job: Job) {
    this.gateway.emitVulnerability(job.data);
  }

  @Process('complete')
  handleComplete(job: Job) {
    this.gateway.emitComplete(job.data);
  }
}
