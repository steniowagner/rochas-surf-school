import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Behind API Gateway every request comes from the VPC link, so the gateway writes the caller's IP into the header
 * named by `CLIENT_IP_HEADER`. The server is only reachable through the gateway, which overwrites it, so a caller
 * can't fake it. Unset (locally), the header is ignored and the plain IP counts.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected override getTracker(req: Record<string, any>): Promise<string> {
    const header = this.config.get<string>('CLIENT_IP_HEADER');
    const clientIp: unknown = header ? req.headers[header.toLowerCase()] : undefined;
    return super.getTracker(clientIp ? { ip: clientIp } : req);
  }
}
