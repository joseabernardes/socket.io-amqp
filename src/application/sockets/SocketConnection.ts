import {Server, Socket} from "socket.io";
import {Consumer, IMessage} from "../amqp/Consumer";
import {Channel, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";


export class SocketConnection {

    private socket: Socket;
    private server: Server;
    private consumer: Consumer;
    private tryOpenConsumerLimit = 10;
    private channel: Channel;
    private channelError: boolean;
    private queue: string;

    public constructor(socket: Socket, server: Server, consumer: Consumer) {
        console.log("New User Connected " + socket.id);
        this.server = server;
        this.socket = socket;
        this.consumer = consumer;
        this.channelError = false;
        this.queue = "";
        this.createListeners();
    }

    private createListeners() {
        this.socket.on('ack', args => this.onAck(args));
        this.socket.on('nack', args => this.onNack(args));
        this.socket.on('disconnect', () => this.onDisconnect());
        this.socket.on('consume', (queue) => this.openChannel(queue));
    }

    private async openChannel(queue) {
        this.queue = queue;
        try {
            this.channel = await this.consumer.openChannel();
            this.channel.on("error", (err) => this.onChannelError("errorChannel", err));
            this.channel.on("close", () => this.onChannelError("closeChannel", null));
            this.log("Channel Open", LogType.log);
            try {
                await this.consumer.startConsumer(this.queue, 10, this.channel, (msg => this.onMessage(msg)));
            } catch (e) {
                this.log("openChannel: Catch " + e, LogType.error);
                this.closeChannel();
            }

        } catch (e) {
            console.log("SocketConnection", e);
            if (--this.tryOpenConsumerLimit > 0) {
                console.log("Reopen Channel");
                this.reopenChannel();
            }
        }


        /*
        this.consumer.openConsumer(queue, 10, msg => this.onMessage(msg)).then(
            value => {
                this.consumerTag = value;
                console.log("Consumer Start: "+value);
            }, reason => {
                console.log(reason);
                if (--this.tryOpenConsumerLimit > 0) {
                    console.log("Reopen Consumer");
                    setTimeout(() => this.startConsumer(queue), 100);
                }

            });*/
    }

    private reopenChannel() {
        this.channel = null;
        setTimeout(() => this.openChannel(this.queue), 100);//voltar a tentar criar channel
    }

    private closeChannel() {
        this.consumer.closeChannel(this.channel).then(value => {
            this.log("closeChannel: Channel Closed", LogType.log);
        }, reason => {
            this.log("closeChannel: " + reason, LogType.error);
        });
    }

    private onDisconnect() {
        console.log("disconected", this.socket.id);
        // this.socket.
        this.closeChannel();
        // this.consumer.closeConsumer(this.consumerTag).then(value => {
        //     console.log("Consumer STOP");
        // }, error => {
        //     console.log("Consumer stop ERROR");
        // });
    }

    private onAck(msg) {
        this.consumer.ackMessage(msg, this.channel).then(
            value => {
                this.emit("acked", msg);
                this.log(value, LogType.log);
            }, reason => {
                this.emit("error", {message: 'Error ack message'});
                this.log(reason, LogType.error);
            });
    }


    private onNack(msg) {
        this.consumer.nackMessage(msg, this.channel).then(
            value => {
                this.emit("nacked", msg);
                this.log(value, LogType.log);
            }, reason => {
                this.emit("error", {message: 'Error nack message'});
                this.log(reason, LogType.error);
            });
    }


    private onMessage(msg: Message | null) {
        const myMsg: IMessage = {content: msg.content.toString(), fields: {deliveryTag: msg.fields.deliveryTag}};
        this.emit('newMessage', myMsg);
    }

    private emit(event: string, message: any) {
        this.socket.emit(event, message);
    }

    private log(message: string, type: LogType) {
        Logger.log('[SocketConnection]', message, type);
    }

    private onChannelError(origin, error) {
        if (origin === 'errorChannel') {
            this.log("onError: " + error.message, LogType.error);
            if (error.code == 404 || error.code == 406) {
                this.emit("m_error", {message: 'Error, please refresh the page'});
                return this.channelError = false;
            }
            this.channelError = true;

        } else if (origin === 'closeChannel') {
            this.log("onError: Channel Closed", LogType.error);
            if (this.channelError) {
                this.channelError = false;
                this.reopenChannel(); //reopen
            }
        }

    }
}
