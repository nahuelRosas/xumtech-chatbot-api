import {
  ConsoleLogger,
  HttpException,
  HttpStatus,
  Injectable,
  Scope,
} from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

import { TCreateResponse, ErrorType } from '../interface/response.interface';
import { ENVIRONMENT } from 'src/common/base/enum/common.enum';
import { ConfigService } from '@nestjs/config';
@Injectable({ scope: Scope.TRANSIENT })
export class ResponseService extends ConsoleLogger {
  mark = 'Handled by ResponseService.errorHandler';
  private readonly status: boolean;
  private fileLogger: winston.Logger;
  private fileLoggingEnabled = false;

  constructor(private readonly configService: ConfigService) {
    super();
    this.status =
      this.configService.get<string>('NODE_ENV') === ENVIRONMENT.PRODUCTION;
    const logDir = path.resolve(process.cwd(), 'logs');
    this.fileLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          maxsize: 10485760,
          maxFiles: 5,
        }),
      ],
    });
  }

  public createResponse: TCreateResponse = ({
    type = 'OK',
    message,
    payload,
  }) => {
    if (message && !this.status) {
      this.verbose(`Message: ${message}`);
      if (this.fileLoggingEnabled) {
        this.fileLogger.info(
          `[RESPONSE] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        );
      }
    }

    if (message && message.toString() === '[object Object]') {
      message = JSON.stringify(message);
    }

    if (this.fileLoggingEnabled) {
      this.fileLogger.info(
        `[RESPONSE] type: ${type}, message: ${message || 'Success'}, payload: ${JSON.stringify(payload)}`,
      );
    }

    return {
      success: HttpStatus[type]
        ? HttpStatus[type] >= 0 && HttpStatus[type] < 400
        : true,
      statusCode: HttpStatus[type] ? HttpStatus[type] : 200,
      message: message || 'Success',
      payload,
      type,
    };
  };

  public errorHandler = ({
    type = 'INTERNAL_SERVER_ERROR',
    error,
  }: {
    type?: keyof typeof HttpStatus;
    error?: ErrorType | ErrorType[];
  }): void => {
    if (error instanceof HttpException) {
      if (JSON.stringify(error).includes(this.mark)) {
        throw error;
      }

      this.handleError({ error });

      throw this.createHttpException({
        code: error.getStatus(),
        error,
      });
    }

    this.handleError({ error });

    throw this.createHttpException({
      code: HttpStatus[type],
      error,
    });
  };

  public setContext(context: string, enableFileLogging = false) {
    super.setContext(context);
    this.fileLoggingEnabled = enableFileLogging;
  }

  public log(message: string | object | number | boolean) {
    super.log(message, this.context);
    if (this.fileLoggingEnabled) {
      this.fileLogger.info(
        `[LOG] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      );
    }
  }

  public verbose(message: string | object | number | boolean) {
    if (!this.status) {
      super.verbose(message, this.context);
      if (this.fileLoggingEnabled) {
        this.fileLogger.verbose(
          `[VERBOSE] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        );
      }
    }
  }

  public debug(message: string | object | number | boolean) {
    if (!this.status) {
      super.debug(message, this.context);
      if (this.fileLoggingEnabled) {
        this.fileLogger.debug(
          `[DEBUG] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        );
      }
    }
  }

  public error(message: string | object | number | boolean) {
    this.logMessage('error', message);
    if (this.fileLoggingEnabled) {
      this.fileLogger.error(
        `[ERROR] ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      );
    }
  }

  private logMessage(
    level: 'verbose' | 'error',
    message: string | object | number | boolean,
  ) {
    if (message && message.toString() === '[object Object]') {
      message = JSON.stringify(message);
    }
    super[level](message, this.context);
    if (this.fileLoggingEnabled) {
      if (level === 'verbose') {
        this.fileLogger.info(`[VERBOSE] ${message}`);
      } else if (level === 'error') {
        this.fileLogger.error(`[ERROR] ${message}`);
      }
    }
  }

  private handleError({
    error,
    description,
  }: {
    error: ErrorType | ErrorType[];
    description?: string;
  }): void {
    if (description) this.error(`Message: ${description}`);
    if (Array.isArray(error)) {
      error.forEach((err) => {
        if (err && err.toString().length > 0) this.error(err.toString());
      });
    } else if (error && error.toString().length > 0) {
      this.error(JSON.stringify(error.message));
    }
  }

  private createHttpException({
    error,
    code,
  }: {
    code: number;
    error: Error | Error[];
  }): HttpException {
    const newError = Array.isArray(error)
      ? new Error(error.map((e) => e?.message).join(', '))
      : error;

    const message = Array.isArray(error)
      ? error.map((e) => e?.message)
      : error?.message || '';

    return new HttpException(message, code, {
      cause: newError,
      description: this.mark,
    });
  }
}
