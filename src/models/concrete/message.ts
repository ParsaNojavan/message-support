import { Document, Types } from "mongoose"
import IEntity from "@app/contracts/models/abstract/iEntity"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import Room from "./room";
import { SenderType } from "@app/contracts/models/enums/sender-type";

@Schema({ timestamps: true })
export default class Message extends Document implements IEntity {
    @Prop({ type: Types.ObjectId, ref: Room.name, required: true, index: true })
    roomId: Types.ObjectId;

    @Prop({ type: String, enum: SenderType, required: true })
    senderType: SenderType;

    @Prop({ required: true })
    text: string;

    @Prop({ default: false })
    isRead: boolean;

}

export const MessageSchema = SchemaFactory.createForClass(Message);