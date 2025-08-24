import { Module } from '@nestjs/common';
import { RESPONSE_SERVICE } from './interface/response.interface';
import { ResponseService } from './service/response.service';

@Module({
  providers: [
    {
      provide: RESPONSE_SERVICE,
      useClass: ResponseService,
    },
  ],
  exports: [RESPONSE_SERVICE],
})
export class ResponseServiceModule {}
