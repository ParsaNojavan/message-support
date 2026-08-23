import { Document, Types } from "mongoose"
import IEntity from "@app/contracts/models/abstract/iEntity"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@Schema({ timestamps: true })
export default class Room extends Document implements IEntity {
    @Prop({ required: true, index: true })
    ownerId: string;

    @Prop({ required: true, index: true })
    visitorId: string;

}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ ownerId: 1, visitorId: 1 }, { unique: true });