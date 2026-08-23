import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ApiKeyValidator } from '@app/contracts/utils/api_key/validator/api-key.validator';
import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.guard';
import { WsApiKeyGuard } from '@app/contracts/utils/api_key/guards/api-key.ws.guard';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    async handleConnection(client: Socket) {
        try {

            const apiKey =
                client.handshake.auth?.apiKey ??
                client.handshake.query?.apiKey ??
                client.handshake.headers['x-api-key'];

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

            client.data.widgetClient = decoded;

            console.log(decoded);

        } catch (error) {

            client.disconnect(true);
        }
    }

    @UseGuards(WsApiKeyGuard)
    @SubscribeMessage('sendMessage')
    handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: any
    ) {

        const widgetClient = client.data.widgetClient;

        console.log(`Message from widget on domain [${widgetClient.allowedDomain}]:`, payload);


        return { status: 'success', received: true };
    }
}
