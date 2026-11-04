import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { ApiResult } from './contract';
import { RpcService } from './rpc.service';
import { StoreEntity } from './seed-data';

const ENDPOINT_PATTERN = /^[a-zA-Z0-9._-]{1,80}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Sanitize input recursively to prevent prototype pollution. */
function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!FORBIDDEN_KEYS.has(k)) {
        clean[k] = sanitizePayload(v, depth + 1);
      }
    }
    return clean;
  }
  return value;
}

@Controller('api')
export class RpcController {
  constructor(
    private readonly rpcService: RpcService,
    private readonly firestoreService: FirestoreService,
  ) {}

  @Get('health')
  getHealth(): Record<string, unknown> {
    return {
      ok: true,
      service: 'omnira-studio-backend',
      version: '1.2.9',
      firebaseProjectId: this.firestoreService.projectId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('rpc/:endpoint')
  async invokeEndpoint(
    @Param('endpoint') endpoint: string,
    @Body() body: Record<string, unknown> | undefined,
  ): Promise<ApiResult> {
    if (!endpoint || !ENDPOINT_PATTERN.test(endpoint)) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Tên endpoint RPC không hợp lệ.' },
      };
    }
    const rawInput = body && typeof body === 'object' && 'input' in body ? body.input : body;
    const sanitized = (sanitizePayload(rawInput) ?? {}) as StoreEntity;
    return this.rpcService.dispatch(endpoint, sanitized);
  }

  @Post('invoke')
  async invokeGeneric(
    @Body() body: { endpoint?: string; input?: Record<string, unknown> } | undefined,
  ): Promise<ApiResult> {
    const endpoint = body?.endpoint ?? '';
    if (!endpoint || !ENDPOINT_PATTERN.test(endpoint)) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Thiếu hoặc sai định dạng tên endpoint RPC.' },
      };
    }
    const sanitized = (sanitizePayload(body?.input) ?? {}) as StoreEntity;
    return this.rpcService.dispatch(endpoint, sanitized);
  }
}
