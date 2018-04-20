import * as amqp from "amqplib";
import {Channel, Connection, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";

export class Consumer {
    private connection: Connection;
    private channel: Channel;
    private connectionError: boolean;
    private channelError: boolean;
    private consumerTag: string;


    public constructor(private hostname: string, private username: string, private password: string, private port: number) {
        this.connection = null;
        this.channel = null;
        this.connectionError = false;
        this.channelError = false;
        this.openConnection();
    }

    private openConnection() {
        amqp.connect({
            username: this.username,
            password: this.password,
            hostname: this.hostname,
            port: this.port
        }).then(conn => {
            conn.on("error", (err) => this.onError("error", err));
            conn.on("close", () => this.onError("close", null));
            this.log("Connected", LogType.log);
            this.connection = conn;
            this.openChannel();
        }, error => {
            this.log("openConnection: " + error, LogType.error);
            return this.reconnect();
        });
    }

    private reconnect() {
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.openConnection(), 1000);//voltar a tentar connectar
    }

    private openChannel() {
        if (!this.connection) {//se nao tiver conecção, tenta mais tarde
            return this.reopenChannel();
        }
        this.connection.createChannel().then(ch => {
            this.channel = ch;
            this.channel.on("error", (err) => this.onError("errorChannel", err));
            this.channel.on("close", () => this.onError("closeChannel", null));
            this.log("Channel Created", LogType.log);
        }).catch(error => {
            if (this.closeOnErr(error)) {
                return this.reopenChannel();
            }
        });
    }

    private reopenChannel() {
        this.channel = null;
        setTimeout(() => this.openChannel(), 1000);//voltar a tentar criar channel
    }

    public openConsumer(queue: string, prefetch: number, onMessage: (msg: Message | null) => any): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!this.isConnected()) {
                reject("NOTCONNECTED");
            }
            this.channel.consume(queue, onMessage, {noAck: false}).then(
                value => {
                    this.consumerTag = value.consumerTag;
                    resolve("Consumer Start");
                },
                error => {
                    this.closeOnErr(error);
                    reject("Consumer Error " + error);
                });
        });
    }

    public ackMessage(message): boolean {
        if (!this.isConnected()) {
            return false;
        }
        try {
            this.channel.ack((message));
            this.log("ACK: " + message, LogType.log);
            return true;
        } catch (e) {
            return this.closeOnErr(e);
        }
    }

    /**
     * @deprecated use openConsumer instead
     * @param {string} queue
     * @param {number} prefetch
     * @param {(msg: Message) => any} onMessage
     * @returns {Promise<string>}
     */
    public startNewConsumer(queue: string, prefetch: number, onMessage: (msg: Message) => any): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!this.connection) {//se nao tiver conecção, rejeita
                reject("Not Connected");
            }
            this.connection.createChannel().then(ch => {

                this.channel.on("error", (err) => this.onError("errorChannel", err));
                this.channel.on("close", () => this.onError("closeChannel", null));
                this.channel = ch;
                ch.prefetch(prefetch);
                this.log("Channel Created", LogType.log);
                ch.consume(queue, onMessage, {noAck: false}).then(value => {
                    this.consumerTag = value.consumerTag;
                    resolve("Consumer Starts");
                }).catch(error => {
                    reject("Consumer Error " + error);
                });
                /*
                (msg: Message) => {
                                this.work(msg, function (ok) {
                                    try {
                                        if (!ok) {
                                            ch.ack(msg);
                                        } else {
                                            ch.reject(msg, true);
                                        }
                                    } catch (e) {
                                        this.closeOnErr(e);
                                    }
                                });


                            }
                 */
            }).catch(error => {
                if (this.closeOnErr(error)) {
                    reject("Creating channel Error");
                }
            });
        });
    }

    public isConnected(): boolean {
        if (this.connection && this.channel) {
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

    private onError(origin: string, error) {
        if (origin === 'error') {
            if (error && error.message !== "Connection closing") {
                this.connectionError = true;
                this.log("Connection Error: " + error.message, LogType.error);
            }
        } else if (origin === 'close') {
            this.log("Connection Closed: " + error, LogType.warning);
            if (this.connectionError) {
                this.connectionError = false;
                this.log("Reconnectiong: " + error, LogType.warning);
                this.reconnect();
            }
        } else if (origin === 'errorChannel') {
            this.channelError = true;
            this.log("Channel Error: " + error.message, LogType.error);
        } else if (origin === 'closeChannel') {
            this.log("Channel Closed", LogType.error);
            if (this.channelError) {
                this.channelError = false;
                //reopen
                this.reopenChannel();
            }
        }
    }
}


export interface IMessage {
    content: string;
    fields: { deliveryTag: number };
}