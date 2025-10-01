import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export const createCorsOptions = (
  configService: ConfigService,
): CorsOptions => {
  const parseOrigins = (originUrl: string | undefined): string[] => {
    if (!originUrl) return [];
    return originUrl
      .split(/[,;]/)
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  };

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      const originUrl = configService.get<string>('ORIGIN_URL');
      const allowedOrigins = parseOrigins(originUrl);
      const cleanOrigin = origin ? origin.replace(/\/+$/, '') : undefined;

      if (!cleanOrigin || allowedOrigins.includes(cleanOrigin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  };
};
