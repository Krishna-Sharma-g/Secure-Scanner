import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class ScanEventsGateway {
  @WebSocketServer()
  server!: Server;

  emitProgress(payload: { scan_id: string; files_processed: number; total_files: number }) {
    const percentage = payload.total_files === 0 ? 0 : Math.round((payload.files_processed / payload.total_files) * 100);
    this.server.emit('scan:progress', { ...payload, percentage });
  }

  emitVulnerability(payload: { scan_id: string; vulnerability: any }) {
    this.server.emit('scan:vulnerability', payload);
  }

  emitComplete(payload: { scan_id: string; summary?: any }) {
    this.server.emit('scan:complete', payload);
  }
}
