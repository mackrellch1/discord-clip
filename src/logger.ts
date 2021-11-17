import { createLogger, format, transports } from 'winston'

const logConfiguration = {
    transports: [
        new transports.File({
            level: 'info',
            filename: 'console.log'
        })
    ]
};

export const logger = createLogger(logConfiguration);

