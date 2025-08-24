import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response, Request } from 'express';

import { generateErrorMessages } from '../utils/utils';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    this.setCorsHeaders(response, request);

    if (exception instanceof HttpException) {
      let responseException = exception.getResponse();
      if (typeof responseException === 'string') {
        return response.status(exception.getStatus()).json({
          success: false,
          ...generateErrorMessages(exception.getStatus(), responseException),
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }

      responseException = this.removeDuplicateValues(responseException);
      return response.status(exception.getStatus()).json({
        success: false,
        ...generateErrorMessages(exception.getStatus(), responseException),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  private setCorsHeaders(response: Response, request: Request): void {
    const origin = request.headers.origin;

    // List of allowed origins - this should match your CORS configuration
    const allowedOrigins = [
      'http://localhost:3000',
      'https://internal.gundo.life',
      'https://api.internal.gundo.app',
    ];

    if (origin && allowedOrigins.includes(origin)) {
      response.header('Access-Control-Allow-Origin', origin);
    }

    response.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    response.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization, x-firebase-appcheck',
    );
    response.header('Access-Control-Allow-Credentials', 'true');
  }

  private removeDuplicateValues(responseException: unknown) {
    const valueToKeyMap = new Map();

    for (const key of Object.keys(responseException)) {
      const value = responseException[key];
      if (!valueToKeyMap.has(value)) {
        valueToKeyMap.set(value, key);
      }
    }

    const normalizedResponse = {};
    for (const [value, key] of valueToKeyMap.entries()) {
      normalizedResponse[key] = value;
    }

    return normalizedResponse;
  }
}
