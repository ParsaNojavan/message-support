import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import Room from './models/concrete/room';
import { InjectModel } from '@nestjs/mongoose';
import Message from './models/concrete/message';
import { SenderType } from '@app/contracts/models/enums/sender-type';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) { }

  async getOrCreateRoom(ownerId: string, visitorId: string): Promise<Room> {

    const room = await this.roomModel.findOneAndUpdate(
      { ownerId, visitorId },
      { $setOnInsert: { ownerId, visitorId } }, 
      { new: true, upsert: true }
    );

    return room;
  }

  async saveVisitorMessage(ownerId: string, visitorId: string, text: string) {
    const room = await this.getOrCreateRoom(ownerId, visitorId);

    const message = await this.messageModel.create({
      roomId: room._id,
      senderType: SenderType.VISITOR,
      text: text,
      isRead: false,
    });

    return { room, message };
  }

  async saveAdminMessage(roomId: string, text: string) {

    const message = await this.messageModel.create({
      roomId: new Types.ObjectId(roomId),
      senderType: SenderType.ADMIN,
      text: text,
      isRead: false,
    });

    return message;
  }
}
