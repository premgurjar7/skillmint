// src/utils/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        }),
        new transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// For morgan (if you use it later)
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

module.exports = logger;