import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import {
  Throttle,
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

import { Config, ConfigModule } from './config';
import { getRequestResponseFromContext } from './utils/nestjs';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [Config],
      useFactory: (config: Config): ThrottlerModuleOptions => {
        const options: ThrottlerModuleOptions = {
          throttlers: [
            {
              ttl: config.rateLimiter.ttl,
              limit: config.rateLimiter.limit,
            },
          ],
          skipIf: () => {
            return !config.node.prod || config.affine.canary;
          },
        };
        if (config.redis.enabled) {
          new Logger(RateLimiterModule.name).log('Use Redis');
          options.storage = new ThrottlerStorageRedisService(
            new Redis(config.redis.port, config.redis.host, {
              username: config.redis.username,
              password: config.redis.password,
              db: config.redis.database + 1,
            })
          );
        }
        return options;
      },
    }),
  ],
})
export class RateLimiterModule {}

@Injectable()
export class CloudThrottlerGuard extends ThrottlerGuard {
  override getRequestResponse(context: ExecutionContext) {
    return getRequestResponseFromContext(context) as any;
  }

  protected override getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(
      req?.get('CF-Connecting-IP') ?? req?.get('CF-ray') ?? req?.ip
    );
  }
}

@Injectable()
export class AuthThrottlerGuard extends CloudThrottlerGuard {
  override async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number
  ): Promise<boolean> {
    const { req } = this.getRequestResponse(context);

    if (req?.url === '/api/auth/session') {
      // relax throttle for session auto renew
      return super.handleRequest(context, limit * 20, ttl, {
        ttl: ttl * 20,
        limit: limit * 20,
      });
    }

    return super.handleRequest(context, limit, ttl, {
      ttl,
      limit,
    });
  }
}

export { Throttle };
