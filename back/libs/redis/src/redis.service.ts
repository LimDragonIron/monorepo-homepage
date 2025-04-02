import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    const redisOptions: RedisOptions = {
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
      showFriendlyErrorStack: true,
      retryStrategy: (times) => {
        const delay = Math.min(1000 * 2 ** times, 30000);
        console.log(`Redis reconnect attempt #${times}, waiting ${delay}ms`);
        return delay;
      },
    };

    this.client = new Redis(redisOptions);
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.client.on('connect', () =>
      console.log('Redis connection established'),
    );
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.client.on('end', () => console.warn('Redis connection closed'));
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      console.log('Redis client initialized successfully');
    } catch (error) {
      console.error(`Failed to connect to Redis: ${error.message}`);
      throw new HttpException(
        `Redis initialization failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      console.log('Redis client disconnected successfully');
    } catch (error) {
      console.error(`Failed to disconnect Redis client: ${error.message}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | string | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;

      // JSON 파싱 시도 → 실패 시 원본 문자열 반환
      try {
        return JSON.parse(data) as T;
      } catch {
        return data; // 일반 문자열 처리
      }
    } catch (error) {
      console.error(`Redis GET 실패: ${error.message}`);
      throw new HttpException(
        `Redis 오류: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<'OK'> {
    try {
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (ttl) {
        return await this.client.setex(key, ttl, stringValue);
      }
      return await this.client.set(key, stringValue);
    } catch (error) {
      console.error(`Failed to set key "${key}" in Redis: ${error.message}`);
      throw new HttpException(
        `Redis SET failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error(
        `Failed to delete key "${key}" from Redis: ${error.message}`,
      );
      throw new HttpException(
        `Redis DELETE failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async flushAll(): Promise<'OK'> {
    try {
      return await this.client.flushall();
    } catch (error) {
      console.error(`Failed to flush all keys in Redis: ${error.message}`);
      throw new HttpException(
        `Redis FLUSHALL failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async withLock<T = unknown>(
    lockKey: string,
    timeoutMs: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    const lockAcquired = await this.client.set(
      lockKey,
      'LOCKED',
      'PX',
      timeoutMs,
      'NX',
    );
    if (!lockAcquired) {
      throw new HttpException('Failed to acquire lock', HttpStatus.CONFLICT);
    }

    try {
      return await callback();
    } finally {
      await this.delete(lockKey);
    }
  }

  async publish(channel: string, message: any): Promise<number> {
    try {
      const serializedMessage =
        typeof message === 'object' ? JSON.stringify(message) : String(message);
      return await this.client.publish(channel, serializedMessage);
    } catch (error) {
      console.error(
        `Failed to publish message to channel "${channel}": ${error.message}`,
      );
      throw new HttpException(
        `Redis PUBLISH failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      console.error(`Failed to ping Redis server: ${error.message}`);
      throw new HttpException(
        `Redis connection issue detected: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async setUserSession(
    userId: string,
    sessionId: string,
    ttl: number,
  ): Promise<void> {
    const key = `user:${userId}:sessions`;
    try {
      await this.client.sadd(key, sessionId);
      await this.client.expire(key, ttl);
    } catch (error) {
      console.error(
        `Failed to set user session for user "${userId}": ${error.message}`,
      );
      throw new HttpException(
        `Redis SET SESSION failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(
        `user:${userId}:sessions`,
        sessionId,
      );
      return result === 1;
    } catch (error) {
      console.error(
        `Failed to validate session for user "${userId}": ${error.message}`,
      );
      throw new HttpException(
        `Redis VALIDATE SESSION failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeSession(userId: string, sessionId: string): Promise<void> {
    try {
      await this.client.srem(`user:${userId}:sessions`, sessionId);
    } catch (error) {
      console.error(
        `Failed to remove session for user "${userId}": ${error.message}`,
      );
      throw new HttpException(
        `Redis REMOVE SESSION failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      return this.client.del(keys);
    }
    return 0;
  }
}
