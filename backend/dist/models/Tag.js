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
exports.TagModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TagSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    color: {
        type: String,
        trim: true,
        default: '#3B82F6' // Default blue color
    },
    category: {
        type: String,
        trim: true,
        enum: ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'],
        default: 'general'
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
// Note: name index is already defined as unique: true in the schema
TagSchema.index({ category: 1 });
TagSchema.index({ isActive: 1 });
TagSchema.index({ usageCount: -1 });
TagSchema.index({ createdBy: 1 });
// Text search index
TagSchema.index({
    name: 'text',
    description: 'text'
});
// Update usage count when tag is used
TagSchema.methods.incrementUsage = function () {
    this.usageCount += 1;
    return this.save();
};
TagSchema.methods.decrementUsage = function () {
    this.usageCount = Math.max(0, this.usageCount - 1);
    return this.save();
};
exports.TagModel = mongoose_1.default.models.Tag || mongoose_1.default.model('Tag', TagSchema);
