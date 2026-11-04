import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { FirestoreService } from '../firebase/firestore.service';

@Controller('api')
export class RpcController {
  constructor(
    private readonly rpcService: RpcService,
    private readonly firestoreService: FirestoreService,
  ) {}

  @Get('health')
  getHealth() {
    return {
      ok: true,
      service: 'omnira-studio-backend',
      version: '1.2.9',
      firebaseProjectId: this.firestoreService.projectId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('rpc/:endpoint')
  async invokeEndpoint(@Param('endpoint') endpoint: string, @Body() body: any) {
    const input = body && typeof body === 'object' && 'input' in body ? body.input : body;
    return this.rpcService.dispatch(endpoint, input);
  }

  @Post('invoke')
  async invokeGeneric(@Body() body: { endpoint: string; input?: any }) {
    if (!body?.endpoint) {
      return {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Thiếu tên endpoint RPC.' },
      };
    }
    return this.rpcService.dispatch(body.endpoint, body.input);
  }
}
