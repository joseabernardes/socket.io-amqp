import {Router} from "express";
import {Request, Response} from "express-serve-static-core";
import {Publisher} from "../amqp/Publisher";
import * as moment from "moment";


const index: Router = Router();
moment.locale('pt');


/**
 *
 */
index.get('/', (req: Request, res: Response) => {
    const publisher: Publisher = req.app.get("publisher");
    publisher.publish("amq.topic", "pt.cpv.lixo", "[" + moment().format('DD MM YYYY') + "]: Message").then(value => {
        console.log("resolve");
        res.status(200).send("res " + value);
    }, reason => {
        console.log("reject");
        res.status(200).send("rej");
    });
});

index.get('/consume/:queue', (req, res) => {
    res.render('index.hbs', {
        pageTitle: 'Consume',
        queue: req.params.queue
    });
});


index.post('/:queue', (req, res) => {
    const publisher: Publisher = req.app.get("publisher");
    const queue = req.params.queue;
    const message = "" + moment().format('DD MM YYYY') + ": " + JSON.stringify(req.body);
    const responseObj = {
        time: moment().format('DD MM YYYY'),
        value: req.body
    };


    publisher.publish("amq.topic", queue, JSON.stringify(req.body)).then(value => {
        res.status(200).send(responseObj);
    }, reason => {
        res.status(500).send("rejected");
    });

});

export default index;


