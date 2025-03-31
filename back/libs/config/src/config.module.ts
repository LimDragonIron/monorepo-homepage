import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './envcofing';
import { validate } from './env-vaildate-schema';
import { ClsMiddleware, ClsModule } from 'nestjs-cls';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import { DatabaseModule } from '@app/database';
import { LoggerModule } from './logger.module';

const X_REQUEST_ID = 'x-request-id';

const clsModule = ClsModule.forRoot({
  global: true,
  middleware: {
    generateId: true,
    idGenerator: (req: Request) => {
      const existingId = req.header[X_REQUEST_ID] as string;
      if (existingId) return existingId;
      return nanoid();
    },
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
      validate,
      expandVariables: true,
    }),
    clsModule,
    LoggerModule.register(),
    DatabaseModule.forRoot(),
  ],
})
export class GlobalConfigModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(ClsMiddleware).forRoutes('*');
  }
}
