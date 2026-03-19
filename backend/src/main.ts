import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendPort = process.env.FRONTEND_PORT || '9998';
  app.enableCors({
    origin: [`http://localhost:${frontendPort}`],
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  const port = Number(process.env.PORT || 3002);
  try {
    await app.listen(port);
    console.log(`Backend listening on http://localhost:${port}`);
  } catch (err) {
    console.error(`Failed to listen on port ${port}:`, err);
    process.exit(1);
  }
}
bootstrap();
