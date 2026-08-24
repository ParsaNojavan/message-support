import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import Room, { RoomDocument } from './models/concrete/room';
import { InjectModel } from '@nestjs/mongoose';
import Message from './models/concrete/message';
import { SenderType } from '@app/contracts/models/enums/sender-type';
import Redis from 'ioredis';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) { }

  async getOrCreateRoom(ownerId: string, visitorId: string): Promise<Room> {

    const result = await this.roomModel.findOneAndUpdate(
      { ownerId, visitorId },
      { $setOnInsert: { ownerId, visitorId } },
      { new: true, upsert: true, includeResultMetadata: true },
    );

    const room = result.value;
    const isNew = !result.lastErrorObject?.updatedExisting;

    if (isNew && room) {
        this.redis.publish('room:created', JSON.stringify({
          roomId: String(room._id),
          ownerId: room.ownerId,
          visitorId: room.visitorId,
          updatedAt: room.updatedAt,
        }));
    }

    return room as Room;
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

  async getRoomMessages(roomId: string, requesterId: string) {

    const room = await this.roomModel.findById(roomId);

    if (!room) throw new NotFoundException('room.not-found')

    if (requesterId !== room.visitorId && requesterId !== room.ownerId)
      throw new ForbiddenException('room.forbidden')

    const messages = await this.messageModel
      .find({ roomId: new Types.ObjectId(roomId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    return messages
  }

  async getAllRooms(page: number = 1, limit: number = 20, ownerId: string) {
    const skip = (page - 1) * limit;

    const rooms = await this.roomModel
      .find({ ownerId: ownerId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return rooms;
  }

}
