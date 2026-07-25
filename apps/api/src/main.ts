import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import compression = require('compression');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get('API_PORT') ?? 4000);
  const webUrls = (config.get<string>('WEB_URL') ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression({ threshold: 2048, level: 6 }));
  app.enableCors({ origin: webUrls, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Colo de Deus API')
    .setDescription('API da Missão Brasília')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port, '0.0.0.0');
  console.log(`API: http://localhost:${port}/api`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}
bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a API:', error);
  process.exitCode = 1;
});
