import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from '@app/config';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl =
      configService.getOrThrow<DatabaseConfig>('database').url;
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    this.logger.log('DatabaseService initialized');
    this.logger.log(`databaseUrl: ${databaseUrl}`);

    // @ts-ignore
    this.$on('query', (query, parmas) => {
      this.logger.log(`Query: ${query}`);
      this.logger.log(`Params: ${JSON.stringify(parmas)}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
