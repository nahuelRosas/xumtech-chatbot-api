import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
  PayloadTooLargeException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as Busboy from 'busboy';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import {
  FileInterceptorOptions,
  FileInformation,
  UploadedFile,
} from '../interface/file.interceptor.interface';

@Injectable()
export class FileInterceptor implements NestInterceptor {
  private readonly defaultOptions: FileInterceptorOptions = {
    maxCount: 1,
    allowedMimeTypes: [],
    limits: { fileSize: 1024 * 1024 * 100 },
  };

  constructor(providedOptions: FileInterceptorOptions = {}) {
    this.options = {
      ...this.defaultOptions,
      ...providedOptions,
      limits: {
        ...(this.defaultOptions.limits || {}),
        ...(providedOptions.limits || {}),
      },
      allowedMimeTypes:
        providedOptions.allowedMimeTypes !== undefined
          ? providedOptions.allowedMimeTypes
          : this.defaultOptions.allowedMimeTypes,
    };
  }

  private options: FileInterceptorOptions;

  private handleFileData(
    id: string,
    files: UploadedFile[],
    fieldName: string,
    fileInfo: FileInformation,
  ) {
    return (data: Buffer) => {
      const file = files.find((file) => file.id === id);
      if (file) {
        file.buffer = Buffer.concat([file.buffer, data]);
        file.size += data.length;
      } else {
        files.push({
          id,
          fieldname: fieldName,
          originalname: fileInfo.filename,
          encoding: fileInfo.encoding,
          mimetype: fileInfo.mimeType,
          size: data.length,
          buffer: data,
        });
      }
    };
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    return new Promise((resolve, reject) => {
      try {
        const busboy = Busboy({
          headers: request.headers,
          limits: this.options.limits ?? { fileSize: 1024 * 1024 * 100 },
        });
        const fields: Record<string, string> = {};
        const files: UploadedFile[] = [];
        let fileCount = 0;
        let tooManyFiles = false;
        busboy.on(
          'file',
          (
            fieldName: string,
            fileStream: Readable,
            fileInfo: FileInformation,
          ) => {
            const id = randomUUID();
            fileCount += 1;
            if (this.options.maxCount && fileCount > this.options.maxCount) {
              tooManyFiles = true;
              fileStream.resume();
              return;
            }
            if (
              Array.isArray(this.options.allowedMimeTypes) &&
              this.options.allowedMimeTypes.length > 0 &&
              !this.options.allowedMimeTypes.includes(fileInfo.mimeType)
            ) {
              fileStream.resume();
              return reject(
                new BadRequestException(
                  `File type ${fileInfo.mimeType} is not allowed.`,
                ),
              );
            }
            fileStream.on(
              'data',
              this.handleFileData(id, files, fieldName, fileInfo),
            );
          },
        );
        busboy.on('field', (fieldName, value) => {
          fields[fieldName] = value;
        });
        busboy.on('finish', () => {
          if (tooManyFiles) {
            return reject(
              new BadRequestException(
                'Too many files uploaded. Maximum allowed is ' +
                  this.options.maxCount,
              ),
            );
          }
          request.body = fields;
          const fileData = files.map((file) => {
            delete file.id;
            return file;
          });
          if (this.options.maxCount === 1) request.file = fileData[0];
          else request.files = fileData;
          resolve(next.handle());
        });
        busboy.on('error', (error) => {
          reject(
            new PayloadTooLargeException(
              'File upload error: ' + (error as Error).message,
            ),
          );
        });
        if (request.rawBody) busboy.end(request.rawBody);
        else request.pipe(busboy);
      } catch (error) {
        reject(
          new InternalServerErrorException(
            'Unexpected error during file upload: ' + error.message,
          ),
        );
      }
    });
  }
}
