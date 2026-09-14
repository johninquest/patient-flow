import { NestFactory } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';
import { AppModule } from './app.module.js';
import { seedAdmin } from './core/auth/seed.js';
import { GlobalExceptionFilter } from './core/common/filters/global-exception.filter.js';
import { createValidationExceptionFactory } from './core/common/validation-exception.factory.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix for all routes except root
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Enable CORS for the React client with credentials
  const allowedOrigins = process.env.CLIENT_URL?.split(',').map((url) =>
    url.trim(),
  ) || ['http://localhost:5173'];

  // Only log CORS config in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Allowed CORS origins:', allowedOrigins);
    console.log('CLIENT_URL env variable:', process.env.CLIENT_URL);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Global validation pipe.
  //
  // Validation is driven by the Standard Schema (Zod) attached to each route's
  // `@Body({ schema })` / `@Param({ schema })` decorator. The pipe itself
  // provides no whitelisting options — unknown-key rejection is expressed in
  // the Zod schemas via `.strict()`.
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      exceptionFactory: createValidationExceptionFactory(),
    }),
  );

  // Global exception filter for structured error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger/OpenAPI documentation setup
  const config = new DocumentBuilder()
    .setTitle('Patient Flow API')
    .setDescription('Healthcare workflow orchestration API')
    .setVersion('1.0')
    .addCookieAuth('session_token')
    .build();

  // Request bodies are documented from the same Zod schemas used for
  // validation (attached via `@Body({ schema })`). zod-openapi converts them to
  // OpenAPI 3.0; `schemaType` distinguishes the input shape from the output
  // shape once schemas start transforming values.
  const document = SwaggerModule.createDocument(app, config, {
    standardSchemaConverter: (schema, { schemaType }) => {
      const converted = createSchema(schema as never, {
        io: schemaType,
        openapiVersion: '3.0.0',
      });
      return { schema: converted.schema, components: converted.components };
    },
  });
  SwaggerModule.setup('api/docs', app, document);

  // Configure logging based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production: only log errors and warnings
    app.useLogger(['error', 'warn']);
  }
  // In development: use default (all log levels)

  // Seed admin user from ADMIN_EMAIL env var (idempotent)
  await seedAdmin();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
