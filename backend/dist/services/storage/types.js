"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageOperationError = exports.StorageConnectionError = exports.StorageConfigError = exports.StorageError = void 0;
// Error Types
class StorageError extends Error {
    constructor(message, providerId, operation, originalError) {
        super(message);
        this.providerId = providerId;
        this.operation = operation;
        this.originalError = originalError;
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
class StorageConfigError extends StorageError {
    constructor(message, providerId) {
        super(message, providerId, 'config');
        this.name = 'StorageConfigError';
    }
}
exports.StorageConfigError = StorageConfigError;
class StorageConnectionError extends StorageError {
    constructor(message, providerId, originalError) {
        super(message, providerId, 'connection', originalError);
        this.name = 'StorageConnectionError';
    }
}
exports.StorageConnectionError = StorageConnectionError;
class StorageOperationError extends StorageError {
    constructor(message, providerId, operation, originalError) {
        super(message, providerId, operation, originalError);
        this.name = 'StorageOperationError';
    }
}
exports.StorageOperationError = StorageOperationError;
