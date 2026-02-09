import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScanEventsGateway } from './scan-events.gateway';

@Injectable()
export class ScanEventsService {
  constructor(
    @InjectQueue('scan-events') private readonly queue: Queue,
    private readonly gateway: ScanEventsGateway,
  ) {}

  async emitProgress(payload: { scan_id: string; files_processed: number; total_files: number }) {
    await this.enqueueOrEmit('progress', payload, () => this.gateway.emitProgress(payload));
  }

  async emitVulnerability(payload: { scan_id: string; vulnerability: any }) {
    await this.enqueueOrEmit('vulnerability', payload, () => this.gateway.emitVulnerability(payload));
  }

  async emitComplete(payload: { scan_id: string; summary?: any }) {
    await this.enqueueOrEmit('complete', payload, () => this.gateway.emitComplete(payload));
  }

  private async enqueueOrEmit(name: string, payload: any, fallback: () => void) {
    try {
      await this.queue.add(name, payload, { attempts: 2, removeOnComplete: true });
    } catch {
      fallback();
    }
  }
}
