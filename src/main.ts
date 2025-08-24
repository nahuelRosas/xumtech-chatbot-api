import * as express from 'express';
import { Express } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SuccessResponseInterceptor } from './common/response_service/interceptor/success_response.interceptor';
import { AppModule } from './app.module';
import { ENVIRONMENT } from './common/base/enum/common.enum';
import { createCorsOptions } from './common/utils/cors.util';

const createSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle('Gundo API')
    .setDescription('Gundo API')
    .setVersion('1.0')
    .build();

const configureApp = (
  app: INestApplication,
  configService: ConfigService,
): void => {
  const document = SwaggerModule.createDocument(app, createSwaggerConfig(), {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api', app, document);
  app.setGlobalPrefix('api');
  app.enableCors(createCorsOptions(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      always: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
};

const bootstrap = async (expressInstance: Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  const configService = app.get(ConfigService);

  configureApp(app, configService);
  await app.startAllMicroservices();

  return app.init();
};

const server = express();

bootstrap(server)
  .then(async (app) => {
    const configService = app.get(ConfigService);
    const nodeEnv = configService.get<string>(
      'NODE_ENV',
      ENVIRONMENT.DEVELOPMENT,
    );
    const port = configService.get<number>('PORT', 8080);

    Logger.log(`Initializing server in ${nodeEnv} mode on port ${port}`);
    await app.listen(port);
  })
  .catch((error) => {
    Logger.error(`Failed to bootstrap application: ${error}`, error.stack);
    process.exit(1);
  });
