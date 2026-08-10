import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

/**
 * Structured error response format
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  errors?: FieldError[];
  timestamp: string;
  path: string;
}

interface FieldError {
  field: string;
  message: string;
}

/**
 * Global exception filter that catches all exceptions and returns
 * structured, user-friendly error responses.
 *
 * Handles:
 * - HttpException (NestJS built-in exceptions)
 * - ValidationError (class-validator errors)
 * - Unknown errors (catch-all for unexpected errors)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let errors: FieldError[] | undefined;

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract error type and message from response
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = this.getErrorTypeFromStatus(statusCode);
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        error = resp.error || this.getErrorTypeFromStatus(statusCode);
        message = resp.message || exception.message;
        errors = resp.errors;
      }
    }
    // Handle validation errors (should be caught by ValidationPipe, but just in case)
    else if (this.isValidationError(exception)) {
      statusCode = HttpStatus.BAD_REQUEST;
      error = 'VALIDATION_ERROR';
      message = 'Validation failed';
      errors = this.formatValidationErrors(exception as ValidationError[]);
    }
    // Handle unknown errors
    else {
      // Log the full error for debugging
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      // In production, don't expose internal error details
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred. Please try again later.';
      } else {
        // In development, show the actual error message
        message =
          exception instanceof Error
            ? exception.message
            : 'An unexpected error occurred';
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors && errors.length > 0) {
      errorResponse.errors = errors;
    }

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Map HTTP status codes to error type names
   */
  private getErrorTypeFromStatus(statusCode: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_ERROR',
    };
    return statusMap[statusCode] || 'ERROR';
  }

  /**
   * Check if the exception is a ValidationError array
   */
  private isValidationError(exception: unknown): boolean {
    return (
      Array.isArray(exception) &&
      exception.length > 0 &&
      exception[0] instanceof ValidationError
    );
  }

  /**
   * Format class-validator ValidationError[] into field-level errors
   */
  private formatValidationErrors(errors: ValidationError[]): FieldError[] {
    const fieldErrors: FieldError[] = [];

    for (const error of errors) {
      const constraints = error.constraints || {};
      const messages = Object.values(constraints);

      if (messages.length > 0) {
        fieldErrors.push({
          field: error.property,
          message: messages.join(', '),
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatValidationErrors(error.children);
        nestedErrors.forEach((nested) => {
          fieldErrors.push({
            field: `${error.property}.${nested.field}`,
            message: nested.message,
          });
        });
      }
    }

    return fieldErrors;
  }
}
