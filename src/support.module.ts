import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { ChatGateway } from './support.gateway';
import { WsApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.ws.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import Room, { RoomSchema } from './models/concrete/room';
import Message, { MessageSchema } from './models/concrete/message';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        console.log('AppModule JWT_SECRET =', secret);

        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }

        return {
          secret,
        };
      },
    }),
    MongooseModule.forRoot(process.env.MONGO_STRING?.toString() ?? '', { dbName: 'message_supportdb' }),
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [SupportController],
  providers: [SupportService,ChatGateway,WsApiKeyGuard],
})
export class SupportModule {}
