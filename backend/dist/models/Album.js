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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumModel = exports.AlbumSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.AlbumSchema = new mongoose_1.Schema({
    name: {
        type: mongoose_1.Schema.Types.Mixed, // Allow both string and multilingual object
        required: true,
    },
    alias: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: mongoose_1.Schema.Types.Mixed, // Allow both string and multilingual object
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    storageProvider: {
        type: String,
        required: true,
        enum: ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'],
        default: 'local'
    },
    storagePath: {
        type: String,
        required: true,
        unique: true
    },
    parentAlbumId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Album',
        default: null
    },
    parentPath: {
        type: String,
        default: ''
    },
    level: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    coverPhotoId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Photo',
        default: null
    },
    photoCount: {
        type: Number,
        default: 0
    },
    firstPhotoDate: {
        type: Date,
        default: null
    },
    lastPhotoDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tag',
            default: []
        }],
    // Access control fields
    allowedGroups: [{
            type: String,
            trim: true
        }],
    allowedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    metadata: {
        location: String,
        date: Date,
        category: String
    }
});
// Update timestamps
exports.AlbumSchema.pre('save', function () {
    this.updatedAt = new Date();
});
// Indexes for performance
exports.AlbumSchema.index({ parentAlbumId: 1, order: 1 });
exports.AlbumSchema.index({ level: 1 });
exports.AlbumSchema.index({ isPublic: 1 });
exports.AlbumSchema.index({ isFeatured: 1 });
exports.AlbumSchema.index({ firstPhotoDate: 1 });
exports.AlbumSchema.index({ lastPhotoDate: 1 });
exports.AlbumSchema.index({ tags: 1 });
// Virtual for full path
exports.AlbumSchema.virtual('fullPath').get(function () {
    if (this.parentPath) {
        return `${this.parentPath}/${this.alias}`;
    }
    return this.alias;
});
// Method to get children
exports.AlbumSchema.methods.getChildren = function () {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.model('Album').find({ parentAlbumId: this._id }).sort({ order: 1 });
    });
};
// Method to get siblings
exports.AlbumSchema.methods.getSiblings = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.parentAlbumId) {
            return yield this.model('Album').find({ parentAlbumId: null }).sort({ order: 1 });
        }
        return yield this.model('Album').find({ parentAlbumId: this.parentAlbumId }).sort({ order: 1 });
    });
};
// Method to get ancestors
exports.AlbumSchema.methods.getAncestors = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const ancestors = [];
        let current = this;
        while (current.parentAlbumId) {
            current = yield this.model('Album').findById(current.parentAlbumId);
            if (current) {
                ancestors.unshift(current);
            }
            else {
                break;
            }
        }
        return ancestors;
    });
};
exports.AlbumModel = mongoose_1.default.models.Album ||
    mongoose_1.default.model('Album', exports.AlbumSchema);
