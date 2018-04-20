export class Logger {


    public static log(append: string, message: string, type: LogType) {
        const text = `${append}: ${message}`;
        switch (type) {
            case LogType.info:
                console.info(text);
                break;
            case LogType.error:
                console.error(text);
                break;
            case LogType.log:
                console.log(text);
                break;
            case LogType.warning:
                console.warn(text);
                break;
            default:
                console.log(text);
                break;
        }
    }
}


export enum LogType {
    warning,
    error,
    info,
    log
}