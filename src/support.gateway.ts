import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ApiKeyValidator } from '@app/contracts/utils/api_key/validator/api-key.validator';
import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.guard';
import { WsApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.ws.guard';
import { SupportService } from './support.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

    constructor(private readonly supportService: SupportService,
        private readonly jwtService: JwtService,
    ) { }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    async handleConnection(client: Socket) {
        try {

            const apiKey =
                client.handshake.auth?.apiKey ??
                client.handshake.query?.apiKey ??
                client.handshake.headers['x-api-key'];

            const token = client.handshake.auth?.token ?? client.handshake.query?.token;

            if (token) {
                const payload = await this.jwtService.verifyAsync(token, {
                    secret: process.env.JWT_SECRET,
                });

                client.data.user = payload;
                client.data.role = 'admin';

                const ownerId = payload.sub

                client.join(`admin_room_${ownerId}`);
                console.log(`✅ Admin connected and joined: admin_room_${ownerId}`);

                return;
            }
            if (!apiKey) {
                client.disconnect(true);
                return;
            }

            const decoded = ApiKeyValidator.verifyAndDecode(apiKey as string);
            if (!decoded) {
                client.disconnect(true);
                return;
            }

            const requestOrigin = client.handshake.headers['origin'] || client.handshake.headers['referer'];
            if (!requestOrigin) {
                client.disconnect(true);
                return;
            }

            const originUrl = new URL(requestOrigin);
            if (originUrl.hostname !== decoded.allowedDomain) {
                console.log(`❌ Domain mismatch: ${originUrl.hostname} !== ${decoded.allowedDomain}`);
                client.disconnect(true);
                return;
            }

            const visitorId = client.handshake.auth?.visitorId || client.handshake.query?.visitorId;
            if (!visitorId) {
                console.log('❌ Visitor ID is missing');
                client.disconnect(true);
                return;
            }

            client.data.widgetClient = decoded;
            client.data.visitorId = visitorId;
            client.data.role = 'visitor';

            console.log(decoded);

            client.join(`visitor_${visitorId}`);
            console.log(`✅ Visitor connected on domain [${decoded.allowedDomain}] and joined: visitor_${visitorId}`);

            return;

        } catch (error) {

            client.disconnect(true);
            return;
        }
    }

    @WebSocketServer()
    server: Server;

    @UseGuards(WsApiKeyGuard)
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: any
    ) {
        const visitorId = client.data.visitorId;
        const widgetClient = client.data.widgetClient;

        console.log(`Message from widget on domain [${widgetClient.allowedDomain}]:`, payload);
        const ownerId = widgetClient.userId;

        const { room, message } = await this.supportService.saveVisitorMessage(
            ownerId,
            visitorId,
            payload.text,
        );

        this.server.to(`admin_room_${ownerId}`).emit('newMessage', {
            roomId: room._id,
            message: message,
        });

        return { status: 'ok', message };
    }

    @SubscribeMessage('adminReply')
    async handleAdminReply(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { roomId: string, visitorId: string, text: string }
    ) {
        if (client.data.role !== 'admin') return;

        const message = await this.supportService.saveAdminMessage(
            payload.roomId,
            payload.text
        );

        this.server.to(`visitor_${payload.visitorId}`).emit('newMessage', {
            roomId: payload.roomId,
            message: message,
        });

        return { status: 'ok', message };
    }
}
