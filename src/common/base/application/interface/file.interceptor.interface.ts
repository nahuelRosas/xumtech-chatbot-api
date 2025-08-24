import type { Limits } from 'busboy';

export type FileInterceptorOptions = {
  limits?: Limits;
  allowedMimeTypes?: string[];
  maxCount?: number;
};

export interface FileInformation {
  filename: string;
  encoding: string;
  mimeType: string;
}

export interface UploadedFile extends Partial<Express.Multer.File> {
  id?: string;
  buffer: Buffer;
  size: number;
}
