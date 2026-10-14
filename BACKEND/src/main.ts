import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { RequestIdInterceptor } from './common/request-logging/request-id.interceptor';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);

  // Serve static fixture assets from public/
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const configService = app.get(ConfigService);

  const port = configService.getOrThrow<number>('port');
  const frontendOrigin =
    configService.getOrThrow<string>('frontendOrigin');

  app.enableCors({
    origin: frontendOrigin,
    exposedHeaders: ['X-Request-Id', 'X-Request-ID', 'x-request-id'],
  });

  app.enableShutdownHooks();

  await app.listen(port);
}

bootstrap();