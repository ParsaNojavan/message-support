import { Controller, Get } from '@nestjs/common';
import { SupportService } from './support.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPCContext } from '@app/contracts/utils/crossCuttingConcerns/decorators/rpc-context.decorator';
import type Context from '@app/contracts/models/dtos/rpcContext';

@Controller()
export class SupportController {
  constructor(private readonly supportService: SupportService) { }

  @MessagePattern('support.messages')
  async getMessages(
    @Payload() payload: { roomId: string, requesterId: string }
  ) {

    return this.supportService.getRoomMessages(payload.roomId, payload.requesterId);
  }

  @MessagePattern('support.rooms')
  async getRooms(
    @Payload() payload: { page?: number; limit?: number },
    @RPCContext() context: Context
  ) {

    const page = payload.page ? Number(payload.page) : 1;
    const limit = payload.limit ? Number(payload.limit) : 20;

    return this.supportService.getAllRooms(page, limit, context.sub);
  }
}
