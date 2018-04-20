import * as express from 'express';
import {join} from "path";
import * as bodyParser from "body-parser";
import index from "./controllers";
import {Publisher} from "./amqp/Publisher";
import {createServer, Server} from "http";
import * as SocketIO from "socket.io";
import {Logger} from "./utils/Logger";
import {SocketConnection} from "./sockets/SocketConnection";
import {Consumer} from "./amqp/Consumer";

export class Application {

    private app: express.Express;
    private port: string | number;
    private server: Server;
    private io: SocketIO.Server;
    private publisher: Publisher;
    private consumer: Consumer;

    public constructor() {
        this.createApp();
        this.createServer();
        this.routes();
        this.sockets();
    }

    private createApp() {
        this.app = express();
        this.port = this.normalizePort(process.env.PORT || '3000');
        this.app.set('port', this.port);
        this.app.set('view engine', 'hbs');//configuarar o HBS
        this.app.set('views', join(__dirname, '/views')); //conf a pasta views
        this.app.use(express.static(join(__dirname, '../public')));
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(bodyParser.json());
        this.publisher = new Publisher("localhost", "admin", "admin", 5672);
        this.consumer = new Consumer("localhost", "admin", "admin", 5672);
        this.app.set('publisher', this.publisher);
    }

    private createServer() {
        this.server = createServer(this.app);
        this.server.listen(this.port);
        this.server.on('error', err => this.onError(err));
        this.server.on('listening', () => this.onListening());
    }

    private sockets(): void {
        this.io = SocketIO(this.server);
        this.io.on("connection", socket => new SocketConnection(socket, this.io, this.consumer));
    }

    private routes() {
        this.app.use('/', index);
    }


    /**
     * Normalize a port into a number, string, or false.
     */
    private normalizePort(val: any): number | string {
        const port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }

        if (port >= 0) {
            // port number
            return port;
        }

        return 3000;
    }

    /**
     * Event listener for HTTP server "error" event.
     */
    private onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind = typeof this.port === 'string'
            ? 'Pipe ' + this.port
            : 'Port ' + this.port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */
    private onListening() {
        const addr = this.server.address();
        const bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;

        console.log('Listening on ' + bind);
    }
}


