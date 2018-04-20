import {Server, Socket} from "socket.io";
import {Consumer, IMessage} from "../amqp/Consumer";
import {Channel, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";


export class SocketConnection {

    private socket: Socket;
    private server: Server;
    private consumer: Consumer;
    private tryOpenConsumerLimit = 10;
    private consumerTag: string;

    public constructor(socket: Socket, server: Server, consumer: Consumer) {
        console.log("New User Connected " + socket.id);
        this.server = server;
        this.socket = socket;
        this.consumer = consumer;
        this.createListeners();
    }


    private createListeners() {
        this.socket.on('ack', args => this.onAck(args));
        this.socket.on('disconnect', () => this.onDisconnect());
        this.socket.on('consume', (queue) => this.startConsumer(queue));

    }

    private startConsumer(queue) {
        console.log("QUEUE " + queue);
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

            });
    }

    private onDisconnect() {
        console.log("disconected", this.socket.id);
        this.consumer.closeConsumer(this.consumerTag).then(value => {
            console.log("Consumer STOP");
        }, error => {
            console.log("Consumer stop ERROR");
        });
    }

    private onAck(msg) {
        this.consumer.ackMessage(msg);
    }

    private onMessage(msg: Message | null) {
        const myMsg: IMessage = {content: msg.content.toString(), fields: {deliveryTag: msg.fields.deliveryTag}};
        this.socket.emit('newMessage', myMsg);
    }

}
