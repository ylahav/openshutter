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
exports.LocationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LocationSchema = new mongoose_1.Schema({
    name: {
        en: { type: String, trim: true },
        he: { type: String, trim: true }
    },
    description: {
        en: { type: String, trim: true },
        he: { type: String, trim: true }
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    coordinates: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        }
    },
    placeId: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true,
        enum: ['city', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'],
        default: 'custom'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
// Indexes for performance
LocationSchema.index({ name: 1 });
LocationSchema.index({ city: 1 });
LocationSchema.index({ country: 1 });
LocationSchema.index({ category: 1 });
LocationSchema.index({ isActive: 1 });
LocationSchema.index({ usageCount: -1 });
LocationSchema.index({ createdBy: 1 });
// Geospatial index for coordinates
LocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });
// Text search index
LocationSchema.index({
    name: 'text',
    description: 'text',
    address: 'text',
    city: 'text',
    state: 'text',
    country: 'text'
});
// Update usage count when location is used
LocationSchema.methods.incrementUsage = function () {
    this.usageCount += 1;
    return this.save();
};
LocationSchema.methods.decrementUsage = function () {
    this.usageCount = Math.max(0, this.usageCount - 1);
    return this.save();
};
exports.LocationModel = mongoose_1.default.models.Location || mongoose_1.default.model('Location', LocationSchema);
