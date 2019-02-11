import * as amqp from "amqplib";
import {Channel, Connection, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";
import {Replies} from "amqplib/properties";
import {setInterval} from "timers";

export class Consumer {
    private connection: Connection;
    private connectionError: boolean;
    private channelError: boolean;


    public constructor(private url: string) {
        this.connection = null;
        this.connectionError = false;
        this.channelError = false;
        this.openConnection();
    }

    private openConnection() {
        amqp.connect(this.url).then(conn => {
            conn.on("error", (err) => this.onError("error", err));
            conn.on("close", () => this.onError("close", null));
            this.log("Connected", LogType.log);
            this.connection = conn;
        }, error => {
            this.log("openConnection: " + error, LogType.error);
            return this.reconnect();
        });
    }

    private reconnect() {
        this.connection = null;
        setTimeout(() => this.openConnection(), 1000);//voltar a tentar connectar
    }

    public async openChannel(): Promise<Channel> {
        if (!this.connection) {//se nao tiver conecção, tenta mais tarde
            throw new Error("No Connection");
        }
        // try {
        return this.connection.createChannel();
        // } catch (e) {
        //     this.log("Channel Created CATCH: " + e, LogType.log);
        //     throw new Error("Channel Created CATCH: " + e);
        // }
    }

    public async startConsumer(queue: string, prefetch: number, channel: Channel, onMessage: (msg: Message | null) => any) {
        if (!this.isConnected(channel)) throw new Error("NOTCONNECTED");

        channel.prefetch(prefetch).then(value => this.log("Prefetch", LogType.log), error => this.log("Prefetch " + error, LogType.error));

        return (await channel.consume(queue, onMessage, {noAck: false})).consumerTag;


        /*.then(
        value => {
            resolve(value.consumerTag);
        },
        error => {
            this.closeOnErr(error);
            reject("Consumer Error " + error);
        });*/
    }

    // public closeConsumer(consumerTag) {
    //     console.log("closeConsumer");
    //     if (this.isConnected()) {
    //         return this.channel.cancel(consumerTag);
    //
    //     }
    // }

    public async ackMessage(message, channel: Channel) {
        if (!this.isConnected(channel))
            throw new Error("NOTCONNECTED");
        try {
            channel.ack((message));
            return "ACKED: " + message;
        } catch (e) {
            throw new Error("ACK ERROR " + e);
        }
    }

    public async nackMessage(message, channel: Channel) {
        if (!this.isConnected(channel))
            throw new Error("NOTCONNECTED");
        try {
            channel.nack((message));
            return "NACKED: " + message;
        } catch (e) {
            throw new Error("NACK ERROR " + e);
        }
    }

    public isConnected(channel: Channel): boolean {
        if (this.connection && channel) {
            return true;
        } else {
            return false;
        }
    }

    private log(message: string, type: LogType) {
        Logger.log('[AMQP-Consumer]', message, type);
    }

    private closeOnErr(err) {
        if (!err) {
            return false;
        }
        this.log("closeOnErr:" + err, LogType.error);
        this.connectionError = true;
        this.closeConnection(); //will reconnect
        return true;
    }

    public closeConnection() {
        if (this.connection) {
            this.connection.close().then(value => {
                this.log("closeConnection", LogType.log);
            }, error => {
                this.log("closeConnection: " + error, LogType.error);
            });
        }
    }


    public async closeChannel(channel: Channel) {
        if (channel)
            return channel.close();
        throw new Error("Channel already close");
    }

    private onError(origin: string, error) {
        if (origin === 'error') {
            if (error && error.message !== "Connection closing") {
                this.connectionError = true;
                this.log("Connection Error: " + error.message, LogType.error);
            }
        } else if (origin === 'close') {
            this.log("Connection Closed: " + error, LogType.warning);
            // if (this.connectionError) {
            this.connectionError = false;
            this.log("Reconnectiong: " + error, LogType.warning);
            this.reconnect();
            // }
        }
    }


    /**
     * @deprecated use openConsumer instead
     * @param {string} queue
     * @param {number} prefetch
     * @param {(msg: Message) => any} onMessage
     * @returns {Promise<string>}
     */
    // public startNewConsumer(queue: string, prefetch: number, onMessage: (msg: Message) => any): Promise<string> {
    //     return new Promise<string>((resolve, reject) => {
    //         if (!this.connection) {//se nao tiver conecção, rejeita
    //             reject("Not Connected");
    //         }
    //         this.connection.createChannel().then(ch => {
    //
    //             this.channel.on("error", (err) => this.onError("errorChannel", err));
    //             this.channel.on("close", () => this.onError("closeChannel", null));
    //             this.channel = ch;
    //             ch.prefetch(prefetch);
    //             this.log("Channel Created", LogType.log);
    //             ch.consume(queue, onMessage, {noAck: false}).then(value => {
    //                 resolve("Consumer Starts");
    //             }).catch(error => {
    //                 reject("Consumer Error " + error);
    //             });
    //             /*
    //             (msg: Message) => {
    //                             this.work(msg, function (ok) {
    //                                 try {
    //                                     if (!ok) {
    //                                         ch.ack(msg);
    //                                     } else {
    //                                         ch.reject(msg, true);
    //                                     }
    //                                 } catch (e) {
    //                                     this.closeOnErr(e);
    //                                 }
    //                             });
    //
    //
    //                         }
    //              */
    //         }).catch(error => {
    //             if (this.closeOnErr(error)) {
    //                 reject("Creating channel Error");
    //             }
    //         });
    //     });
    // }
}


export interface IMessage {
    content: string;
    fields: { deliveryTag: number };
}