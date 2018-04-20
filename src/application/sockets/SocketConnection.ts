import {Server, Socket} from "socket.io";
import {Consumer, IMessage} from "../amqp/Consumer";
import {Channel, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";


export class SocketConnection {

    private socket: Socket;
    private server: Server;
    private consumer: Consumer;
    private error = false;
    private tryOpenConsumerLimit = 10;

    public constructor(socket: Socket, server: Server) {
        console.log("New User Connected " + socket.id);
        this.server = server;
        this.socket = socket;
        this.consumer = new Consumer("localhost", "admin", "admin", 5672); //opens connection and channel
        this.createListeners();
    }


    private createListeners() {
        this.socket.on('ack', args => this.onAck(args));
        this.socket.on('disconnect', () => this.onDisconnect());
        setTimeout(() => this.startConsumer(), 10);

    }

    private startConsumer() {
        this.consumer.openConsumer("pt.cpv.lixo", 10, msg => this.onMessage(msg)).then(
            value => {
                console.log(value);
            }, reason => {
                console.log(reason);
                if (--this.tryOpenConsumerLimit > 0) {
                    console.log("Reopen Consumer");
                    setTimeout(() => this.startConsumer(), 100);
                }

            });
    }


    private onDisconnect() {
        console.log("disconected", this.socket.id);
        this.consumer.closeConnection();
    }

    private onAck(msg) {
        this.consumer.ackMessage(msg);
    }


    private onMessage(msg: Message | null) {
        const myMsg: IMessage = {content: msg.content.toString(), fields: {deliveryTag: msg.fields.deliveryTag}};
        this.socket.emit('newMessage', myMsg);
    }

}
