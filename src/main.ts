import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: 'https://project-room-system.vercel.app',
    credentials: true,
  });
  
  app.use(cookieParser());
  
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
