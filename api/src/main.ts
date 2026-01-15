import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for the SvelteKit client with credentials
  const allowedOrigins = process.env.CLIENT_URL?.split(',').map(url => url.trim()) || ['http://localhost:5173'];
  
  app.enableCors({
    origin: allowedOrigins, // ✅ Use array of origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
