import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { ChatGateway } from './support.gateway';
import { WsApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.ws.guard';

@Module({
  imports: [],
  controllers: [SupportController],
  providers: [SupportService,ChatGateway,WsApiKeyGuard],
})
export class SupportModule {}
