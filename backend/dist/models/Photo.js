"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoModel = exports.PhotoSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.PhotoSchema = new mongoose_1.Schema({
    title: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        default: {}
    },
    description: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    filename: {
        type: String,
        required: true,
        unique: true
    },
    originalFilename: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    dimensions: {
        width: { type: Number, required: true },
        height: { type: Number, required: true }
    },
    storage: {
        provider: { type: String, required: true },
        fileId: { type: String, required: true },
        url: { type: String, required: true },
        bucket: String,
        folderId: String,
        path: { type: String, required: true },
        thumbnailPath: { type: String, required: true }
    },
    albumId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Album'
    },
    tags: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tag',
            default: []
        }],
    people: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Person',
            default: []
        }],
    location: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Location'
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    isLeading: {
        type: Boolean,
        default: false
    },
    isGalleryLeading: {
        type: Boolean,
        default: false
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    exif: {
        make: String,
        model: String,
        dateTime: Date,
        exposureTime: String,
        fNumber: Number,
        iso: Number,
        focalLength: Number,
        gps: {
            latitude: Number,
            longitude: Number,
            altitude: Number
        },
        software: String,
        copyright: String
    },
    metadata: {
        location: String,
        category: String,
        rating: Number
    },
    faceRecognition: {
        faces: [{
                descriptor: [Number], // 128D face descriptor vector
                box: {
                    x: Number,
                    y: Number,
                    width: Number,
                    height: Number
                },
                landmarks: {
                    leftEye: { x: Number, y: Number },
                    rightEye: { x: Number, y: Number },
                    nose: { x: Number, y: Number },
                    mouth: { x: Number, y: Number }
                },
                detectedAt: { type: Date, default: Date.now },
                matchedPersonId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Person' },
                confidence: Number
            }],
        processedAt: Date,
        modelVersion: String
    }
}, {
    timestamps: true
});
// Indexes
exports.PhotoSchema.index({ albumId: 1 });
exports.PhotoSchema.index({ uploadedBy: 1 });
exports.PhotoSchema.index({ people: 1 });
exports.PhotoSchema.index({ tags: 1 });
exports.PhotoSchema.index({ location: 1 });
exports.PhotoSchema.index({ isPublished: 1 });
exports.PhotoSchema.index({ uploadedAt: -1 });
// filename index is already defined as unique: true in the schema
exports.PhotoModel = mongoose_1.default.models.Photo ||
    mongoose_1.default.model('Photo', exports.PhotoSchema);
