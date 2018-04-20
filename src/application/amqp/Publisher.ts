import * as amqp from 'amqplib';
import {ConfirmChannel, Connection} from "amqplib";
import {Logger, LogType} from "../utils/Logger";


export class Publisher {
    private connection: Connection;
    private channel: ConfirmChannel;
    private offlinePubQueue;


    public constructor(private hostname: string, private username: string, private password: string, private port: number) {
        this.connection = null;
        this.channel = null;
        this.offlinePubQueue = [];
        this.openConnection();
    }

    // 'amqp://admin:admin@localhost'

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
            this.log(error, LogType.error);
            return this.reconnect();
        });
    }

    private reconnect() {
        setTimeout(() => this.openConnection(), 1000);//voltar a tentar connectar
    }

    private openChannel() {
        this.connection.createConfirmChannel().then(ch => {
            ch.on("error", (err) => this.onError("errorChannel", err));
            ch.on("close", () => this.onError("closeChannel", null));
            this.channel = ch;
            this.log("Channel Created", LogType.log);
            while (true) {
                const m = this.offlinePubQueue.shift();
                if (!m) {
                    break;
                }
                this.publish(m[0], m[1], m[2]);
            }
        }).catch(error => {
            if (this.closeOnErr(error)) {
                return;
            }
        });
    }

    public publish(exchange: string, routingKey: string, content: string): Promise<any> {
        return new Promise<any>(((resolve, reject) => {
            try {
                if (!this.isConnected()) {
                    throw new Error("Not connected yet");
                }
                this.channel.publish(exchange, routingKey, new Buffer(content), {persistent: true},
                    (err, ok) => {
                        if (err) {
                            throw new Error(err);
                        } else {
                            this.log("Message send <<" + content + ">>", LogType.log);
                            resolve();
                        }
                    });
            } catch (e) {
                this.log("Publish Error " + e.message, LogType.error);
                this.offlinePubQueue.push([exchange, routingKey, content]);
                reject();
            }
        }));
    }

    public isConnected(): boolean {
        if (this.connection && this.channel) {
            return true;
        } else {
            return false;
        }
    }

    private log(message: string, type: LogType) {
        Logger.log('[AMQP-Publisher]', message, type);
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
            this.log("Reopening channel", LogType.error);
        }
    }

}

/*
const publisher = new Publisher("localhost", "admin", "admin", 5672);
publisher.publish("amq.topic", "pt.cpv.lixo", "Ho, it works!").then(value => console.log(value)).catch(reason => console.log(reason));
*/
/*

const instance = new RabbitMQ();
console.log(instance);

let contador = 0;

setInterval(() => {
    instance.publish("amq.topic", "pt.cpv.lixo", new Buffer("work work work " + ++contador));
}, 1000);

instance.start();

console.log("start");
*/
/*
//CRIAR QUEUES
ch.assertQueue("pt.cpv.lixo", {durable: true}).then(value => {
    console.log("[AMQP] create queue ", value);
    return ch.bindQueue("pt.cpv.lixo", "amq.topic", "pt.cpv.lixo");
}).then(value => {
    console.log("[AMQP] bind queue ", value);
}).catch(error => {
    console.log("[AMQP] create queue error ", error);
});
*/