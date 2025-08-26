import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_ENVIRONMENT_SERVICE } from '../env_config/interface/envconfig.interface';
import { EnvConfigService } from '../env_config/service/envconfig.service';

@Injectable()
export class GlobalDateLockGuard implements CanActivate {
  constructor(
    @Inject(APP_ENVIRONMENT_SERVICE)
    private readonly envConfigService: EnvConfigService,
  ) {}

  canActivate(_context: ExecutionContext): boolean {
    void _context;
    try {
      const configuredDate =
        this.envConfigService.retrieveSetting<string>('DISABLE_AFTER_DATE');

      if (!configuredDate) return true;

      const parsedDate = this.parseDateString(configuredDate);
      if (!parsedDate) return true;

      const now = new Date();

      if (now >= parsedDate) {
        throw new HttpException(
          'Service disabled due to configured shutdown date',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('GlobalDateLockGuard error', error);
      return true;
    }
  }

  private parseDateString(dateStr: string): Date | null {
    const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoMatch) {
      const d = new Date(dateStr + 'T00:00:00Z');
      return isNaN(d.getTime()) ? null : d;
    }

    const dmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmMatch) {
      const day = parseInt(dmMatch[1], 10);
      const month = parseInt(dmMatch[2], 10) - 1;
      const year = parseInt(dmMatch[3], 10);
      const d = new Date(Date.UTC(year, month, day, 0, 0, 0));
      return isNaN(d.getTime()) ? null : d;
    }

    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
}
