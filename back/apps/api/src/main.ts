import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { ApiModule } from './api.module';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AuthGuard } from './auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/redis';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    cors: {
      origin: getOrigins(),
    },
    bufferLogs: true,
  });

  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const redisService = app.get(RedisService);

  app.useGlobalGuards(
    new AuthGuard(jwtService, reflector, configService, redisService),
  );

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  setSwagger(app);

  const PORT = process.env.APP_PORT || 8080;

  await app.listen(PORT);

  logger.log(`> NODE_ENV is ${process.env.NODE_ENV}`);
  logger.log(`> Ready on PORT: ${PORT}`);
  logger.log(
    `> System Time Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  );
  logger.log(`> Current System Time: ${new Date().toString()}`);

  process.on(
    'unhandledRejection',
    (reason: string, promise: Promise<unknown>) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      throw reason;
    },
  );

  process.on('uncaughtException', (error) => {
    logger.error(error);
  });
}

function getOrigins() {
  const origins = process.env.ORIGINS || '';
  return origins.split(',');
}

function setSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Backend')
    .setDescription('API Backend Api Description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
}

bootstrap();
