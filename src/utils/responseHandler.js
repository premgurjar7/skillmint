// src/utils/responseHandler.js
class ResponseHandler {
    static sendSuccess(res, message, data = null, statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static sendError(res, message, errors = null, statusCode = 500) {
        return res.status(statusCode).json({
            success: false,
            message,
            errors,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { ResponseHandler };