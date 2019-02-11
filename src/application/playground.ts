import * as request from "request";


for (let i = 0; i < 100; i++) {
    request({
        url: `http://localhost:3000/consume/pt.cpv.lixo`,
        json: true
    }, (error, response, body) => { // errors -> lado do client
        console.log(i);
        // console.log(JSON.stringify(error, undefined, 2));
    });

}
