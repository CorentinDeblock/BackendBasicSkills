import winston, { createLogger, format, transports } from 'winston';
import moment from 'moment';
import fs from 'fs';

// This is a custom transport that will create a new file if it doesn't exist
class RecreatingFileTransport extends transports.File {
    private opts: transports.FileTransportOptions;

    /**
     * Creates a new RecreatingFileTransport
     * Filename needs to be provided
     * 
     * @param opts The options to create the transport
     */
    constructor(opts: transports.FileTransportOptions) {
        super(opts);
        this.opts = opts;

        if(!opts.filename) {
            throw new Error("Filename is required");
        }
    }

    /**
     * Check if the directory 'logs' exists, if not create it
     * Check if the file provided in the options.filename exists, if not create it
     * Logs the message to the file and propagates the log to other transports
     * 
     * @param info The information to log
     * @param callback The callback to call when the log is done
     */
    log(info: winston.LogEntry, callback: () => void) {
        // Create the logs folder if it doesn't exist
        if(!fs.existsSync("logs")) {
            fs.mkdirSync("logs");
        }

        // Create the file if it doesn't exist
        // The filename is the path to the file in the options transport
        if(!fs.existsSync(this.opts.filename!)) {
            // Create the file with the current date
            fs.writeFileSync(this.opts.filename!, "");
        }

        super.log?.(info, callback);
    }
}

class Logger {
    private logger: winston.Logger;
    private static instance: Logger;

    private constructor() {
        const { combine, timestamp, printf } = format;

        const myFormat = printf(({ level, message, timestamp }) => {
            const time = moment().format("YYYY-MM-DD HH:mm:ss");
            return `${time} [${level}]: ${message}`;
        });

        const logger = createLogger({
            // The level is the minimum level of log that will be shown
            level: 'info',
            format: combine(
                timestamp(),
                myFormat
            ),
            transports: [
                new transports.Console(),
                // Watch if the file combined.log exists, if not create it
                new RecreatingFileTransport({ filename: 'logs/combined.log' }),
                // Watch if the file error.log exists, if not create it
                new RecreatingFileTransport({ filename: 'logs/error.log', level: 'error' }),
            ],
        });

        this.logger = logger;
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public log(message: string): void {
        this.logger.log('info', message);
    }

    public error(message: string): void {
        this.logger.log('error', message);
    }

    public warn(message: string): void {
        this.logger.log('warn', message);
    }

    public info(message: string): void {
        this.logger.log('info', message);
    }

    public debug(message: string): void {
        this.logger.log('debug', message);
    }
}

export default Logger.getInstance();