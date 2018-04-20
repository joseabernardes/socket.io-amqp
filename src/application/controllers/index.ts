import {Router} from "express";
import {Request, Response} from "express-serve-static-core";
import {Publisher} from "../amqp/Publisher";


const index: Router = Router();

/**
 *
 */
index.get('/', (req: Request, res: Response) => {
    const publisher: Publisher = req.app.get("publisher");
    publisher.publish("amq.topic", "pt.cpv.lixo", "Message " + new Date().getTime()).then(value => {
        console.log("resolve");
        res.status(200).send("res");
    }, reason => {
        console.log("reject");
        res.status(200).send("rej");
    });
});

index.get('/consume', (req, res) => {
    res.render('index.hbs', {
        pageTitle: 'Consume'
    });
});

export default index;


