const { ResponseHandler } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    try {
        // Log the error
        logger.error(`Error occurred: ${err.message}`, {
            stack: err.stack,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userId: req.user?._id || 'anonymous'
        });

        // Handle different types of errors
        let statusCode = err.statusCode || 500;
        let message = err.message || 'Internal Server Error';
        let errors = err.errors || null;

        // Mongoose errors
        if (err.name === 'CastError') {
            statusCode = 400;
            message = `Invalid ${err.path}: ${err.value}`;
        } else if (err.name === 'ValidationError') {
            statusCode = 422;
            message = 'Validation Error';
            errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
        } else if (err.code === 11000) {
            statusCode = 409;
            const field = Object.keys(err.keyValue)[0];
            message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            statusCode = 401;
            message = 'Invalid token';
        } else if (err.name === 'TokenExpiredError') {
            statusCode = 401;
            message = 'Token has expired';
        }

        // Multer errors (file upload)
        if (err.code === 'LIMIT_FILE_SIZE') {
            statusCode = 413;
            message = 'File size too large';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            statusCode = 413;
            message = 'Too many files';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            statusCode = 400;
            message = 'Unexpected file field';
        }

        // Custom application errors
        if (err.name === 'AppError') {
            statusCode = err.statusCode || 400;
            message = err.message;
            errors = err.errors;
        }

        // Send error response
        if (process.env.NODE_ENV === 'production') {
            // Don't expose stack trace in production
            return ResponseHandler.sendError(res, message, null, statusCode);
        } else {
            // Include stack trace in development
            return ResponseHandler.sendError(res, message, {
                stack: err.stack,
                ...(errors && { errors })
            }, statusCode);
        }
    } catch (error) {
        // Fallback error handler
        console.error('Error in error handler:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            timestamp: new Date().toISOString()
        });
    }
};

const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const validationErrorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return ResponseHandler.sendValidationError(res, errors);
    }
    next(err);
};

const mongooseErrorHandler = (err, req, res, next) => {
    if (err.name === 'MongoError') {
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return ResponseHandler.sendConflict(res, 
                `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            );
        }
        
        return ResponseHandler.sendInternalError(res, 'Database error occurred');
    }
    next(err);
};

const jwtErrorHandler = (err, req, res, next) => {
    if (err.name === 'JsonWebTokenError') {
        return ResponseHandler.sendUnauthorized(res, 'Invalid token');
    }
    if (err.name === 'TokenExpiredError') {
        return ResponseHandler.sendUnauthorized(res, 'Token has expired');
    }
    next(err);
};

const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.name === 'RateLimitError') {
        return ResponseHandler.sendTooManyRequests(res, 'Too many requests, please try again later');
    }
    next(err);
};

const corsErrorHandler = (err, req, res, next) => {
    if (err.name === 'CorsError') {
        return ResponseHandler.sendForbidden(res, 'CORS error: Not allowed by CORS');
    }
    next(err);
};

const securityErrorHandler = (err, req, res, next) => {
    // Handle security-related errors
    if (err.name === 'SecurityError') {
        logger.Logger.logSecurityEvent(err.message, 'high', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        
        return ResponseHandler.sendForbidden(res, 'Security violation detected');
    }
    next(err);
};

const unhandledRejectionHandler = (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // In production, you might want to send an alert or restart the process
    if (process.env.NODE_ENV === 'production') {
        // Send alert to monitoring service
        console.error('Unhandled Rejection:', reason);
    }
};

const uncaughtExceptionHandler = (error) => {
    logger.error('Uncaught Exception:', error);
    
    // In production, you might want to exit and let process manager restart
    if (process.env.NODE_ENV === 'production') {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    }
};

const timeoutHandler = (timeout) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            const error = new Error('Request timeout');
            error.statusCode = 408;
            next(error);
        });
        
        res.setTimeout(timeout, () => {
            const error = new Error('Response timeout');
            error.statusCode = 408;
            next(error);
        });
        
        next();
    };
};

const requestSizeLimitHandler = (limit) => {
    return (err, req, res, next) => {
        if (err && err.code === 'ENTITY_TOO_LARGE') {
            return ResponseHandler.sendError(res, 'Request entity too large', null, 413);
        }
        next(err);
    };
};

const maintenanceModeHandler = (req, res, next) => {
    if (process.env.MAINTENANCE_MODE === 'true') {
        return ResponseHandler.sendError(res, 
            'Service is under maintenance. Please try again later.',
            null,
            503
        );
    }
    next();
};

// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode = 400, errors = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.errors = errors;
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

// Error types for common scenarios
const Errors = {
    NotFound: (resource = 'Resource') => new AppError(`${resource} not found`, 404),
    Unauthorized: (message = 'Unauthorized access') => new AppError(message, 401),
    Forbidden: (message = 'Access forbidden') => new AppError(message, 403),
    BadRequest: (message = 'Bad request') => new AppError(message, 400),
    ValidationError: (errors) => new AppError('Validation failed', 422, errors),
    Conflict: (message = 'Resource already exists') => new AppError(message, 409),
    InternalError: (message = 'Internal server error') => new AppError(message, 500)
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    validationErrorHandler,
    mongooseErrorHandler,
    jwtErrorHandler,
    rateLimitErrorHandler,
    corsErrorHandler,
    securityErrorHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler,
    timeoutHandler,
    requestSizeLimitHandler,
    maintenanceModeHandler,
    AppError,
    Errors
};