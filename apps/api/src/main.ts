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
  const environment = config.get<string>('NODE_ENV', 'development');

  const port = Number(config.get('PORT') ?? config.get('API_PORT') ?? 4000);

  const webUrls = (config.get<string>('WEB_URL') ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  if (config.get<string>('TRUST_PROXY') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(compression({ threshold: 2048, level: 6 }));
  app.enableCors({ origin: webUrls, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED') === 'true';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Colo de Deus API')
      .setDescription('API da Missão Brasília')
      .setVersion('7.2.1')
      .addBearerAuth()
      .build();

    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(port, '0.0.0.0');

  console.log('');
  console.log('==========================================');
  console.log('🚀 COLO DE DEUS API');
  console.log('==========================================');
  console.log(`Ambiente : ${environment}`);
  console.log(`API      : http://localhost:${port}/api`);
  console.log(`Swagger  : ${swaggerEnabled ? `http://localhost:${port}/docs` : 'desativado'}`);
  console.log(`Porta    : ${port}`);
  console.log('==========================================');
  console.log('');
}

bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a API:', error);
  process.exitCode = 1;
});
