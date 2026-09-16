import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);

  const port = configService.getOrThrow<number>('port');
  const frontendOrigin =
    configService.getOrThrow<string>('frontendOrigin');

  app.enableCors({
    origin: frontendOrigin,
  });

  app.enableShutdownHooks();

  await app.listen(port);
}

bootstrap();