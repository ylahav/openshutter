"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Ensure MongoDB connection is established
 * Note: In NestJS, the database connection is handled by DatabaseModule,
 * but this function can be used by standalone services that need to ensure connection
 */
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    // If already connected, return the connection
    if (mongoose_1.default.connection.readyState === 1) {
        return mongoose_1.default.connection;
    }
    // If connecting, wait for it
    if (mongoose_1.default.connection.readyState === 2) {
        return new Promise((resolve, reject) => {
            mongoose_1.default.connection.once('connected', () => resolve(mongoose_1.default.connection));
            mongoose_1.default.connection.once('error', reject);
        });
    }
    // Otherwise, connect (this should rarely happen in NestJS context)
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable');
    }
    try {
        const conn = yield mongoose_1.default.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
});
exports.connectDB = connectDB;
