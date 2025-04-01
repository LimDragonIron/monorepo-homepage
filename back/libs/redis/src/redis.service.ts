import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisKey, RedisValue } from 'ioredis';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: true, // 수동 연결 관리
    });

    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.client.on('connect', () =>
      console.log('Redis connection established'),
    );

    this.client.on('error', (err) => console.error('Redis Client Error:', err));
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  ///
  async get<T = unknown>(key: RedisKey): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      throw new HttpException(
        `Redis GET 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async set(key: RedisKey, value: RedisValue, ttl?: number): Promise<'OK'> {
    try {
      const stringValue = JSON.stringify(value);
      return ttl
        ? this.client.setex(key, ttl, stringValue)
        : this.client.set(key, stringValue);
    } catch (error) {
      throw new HttpException(
        `Redis SET 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(key: RedisKey): Promise<number> {
    try {
      return this.client.del(key);
    } catch (error) {
      throw new HttpException(
        `Redis DEL 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async keys(pattern = '*'): Promise<string[]> {
    try {
      return this.client.keys(pattern);
    } catch (error) {
      throw new HttpException(
        `Redis KEYS 조회 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async flushAll(): Promise<'OK'> {
    try {
      return this.client.flushall();
    } catch (error) {
      throw new HttpException(
        `Redis FLUSHALL 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  //
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
      throw new HttpException('리소스 락 획득 실패', HttpStatus.CONFLICT);
    }

    try {
      return await callback();
    } finally {
      await this.delete(lockKey);
    }
  }

  async publish(channel: string, message: any): Promise<number> {
    try {
      return this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      throw new HttpException(
        `Redis PUBLISH 실패: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //
  async ping(): Promise<string> {
    try {
      return this.client.ping();
    } catch (error) {
      throw new HttpException(
        `Redis 연결 이상: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
