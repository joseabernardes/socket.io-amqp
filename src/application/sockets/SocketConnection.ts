import {Server, Socket} from "socket.io";
import {Consumer} from "../amqp/Consumer";
import {Channel, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";


export class SocketConnection {

    private socket: Socket;
    private server: Server;
    private consumer: Consumer;
    private channel: Channel;
    private consumerTag: string;
    private error = false;


    public constructor(socket: Socket, server: Server, consumer: Consumer) {
        console.log("New User Connected " + socket.id);
        this.server = server;
        this.socket = socket;
        this.consumer = consumer;
        this.createListeners();
    }


    private createListeners() {
        this.startConsumer();
        this.socket.on('ack', args => this.onAck(args));

        this.socket.on('disconnect', () => this.onDisconnect());
    }

    private startConsumer() {
        this.consumer.startNewConsumer("pt.cpv.lixo", msg => this.onMessage(msg)).then(value => {
            this.channel = value.channel;
            this.consumerTag = value.consumerTag;
            this.channel.on("error", (err) => this.onError("errorChannel", err));
            this.channel.on("close", () => this.onError("closeChannel", this.error));
        }, reason => {
            console.log(reason);
        });
    }


    private onDisconnect() {
        console.log("disconected", this.socket.id);
        if (this.isChannelOpen()) {
            this.channel.close().then(() => {
            }, error => {
            });
        }
    }

    private onAck(msg) {
        console.log("ack ", msg);
        if (this.isChannelOpen()) {
            console.log("isConnected");
            this.channel.ack(msg);
        } else {
            console.log("NOT CONNECTED");
        }
    }

    private isChannelOpen() {
        if (this.channel) {
            return true;
        } else {
            return false;
        }
    }

    private onMessage(msg: Message | null) {
        const myMsg: IMessage = {content: msg.content.toString(), fields: {deliveryTag: msg.fields.deliveryTag}};
        this.socket.emit('newMessage', myMsg);
    }

    private onError(origin: string, error) {
        if (origin === 'errorChannel') {
            this.error = true;
            Logger.log('[AMQP-Socket]', "Channel Error: " + error.message, LogType.error);
        } else if (origin === 'closeChannel') {
            Logger.log('[AMQP-Socket]', "Channel Closed", LogType.warning);
            if (this.error) {
                this.channel = null;
                this.startConsumer();
                this.error = false;
            }
        }
    }
}

export interface IMessage {
    content: string;
    fields: { deliveryTag: number };
}