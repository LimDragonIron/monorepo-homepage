import type { ConfigType } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set');
  }
  if (!refreshTokenSecret) {
    throw new Error('REFRESH_TOKEN_SECRET is not set');
  }
  return {
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    refreshToken: {
      secret: refreshTokenSecret,
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
  };
});

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL ?? 'error',
}));

export const databaseConfig = registerAs('database', () => ({
  url: gnerateDatabaseUrl(
    process.env.DB_HOST,
    +process.env.DB_PORT,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.DB_NAME,
  ),
}));

const gnerateDatabaseUrl = (
  host = 'localhost',
  port = 3306,
  user = 'root',
  password = '1234',
  database = 'test',
) => {
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

export type AuthConfig = ConfigType<typeof authConfig>;
export type DatabaseConfig = ConfigType<typeof databaseConfig>;
export type LoggerConfig = ConfigType<typeof loggerConfig>;

export const configuration = [authConfig, databaseConfig, loggerConfig];
