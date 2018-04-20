import * as amqp from "amqplib";
import {Channel, Connection, Message} from "amqplib";
import {Logger, LogType} from "../utils/Logger";

export class Consumer {
    private connection: Connection;

    public constructor(private hostname: string, private username: string, private password: string, private port: number) {
        this.connection = null;
        this.openConnection();
    }

    public openConnection() {
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
        }, error => {
            this.log(error, LogType.error);
            return this.reconnect();
        });
    }

    private reconnect() {
        setTimeout(() => this.openConnection(), 1000);//voltar a tentar connectar
    }

    public startNewConsumer(queue: string, onMessage: (msg: Message) => any): Promise<IConsumer> {
        return new Promise<IConsumer>((resolve, reject) => {
            if (!this.isConnected()) {
                reject("Not Connected");
            }
            this.connection.createChannel().then(ch => {
                ch.prefetch(10);
                this.log("Channel Created", LogType.log);
                ch.consume(queue, onMessage, {noAck: false}).then(value => {
                    resolve({channel: ch, consumerTag: value.consumerTag});
                }).catch(error => {
                    reject("Consume Error");
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
        if (this.connection) {
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
        this.log(err, LogType.error);
        this.connection.close(); //will reconnect
        return true;
    }

    private onError(origin: string, error) {
        if (origin === 'error') {
            if (error && error.message !== "Connection closing") {
                this.log("Connection Error: " + error.message, LogType.error);
            }
        } else if (origin === 'close') {
            this.log("Reconnectiong: " + error, LogType.warning);
            return this.reconnect();
        } else if (origin === 'errorChannel') {
            this.log("Channel Error: " + error.message, LogType.error);
        } else if (origin === 'closeChannel') {
            this.log("Channel Closed", LogType.error);
        }
    }
}


export interface IConsumer {
    consumerTag: string;
    channel: Channel;
}


// new Comsumer().start();