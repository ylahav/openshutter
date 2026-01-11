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
exports.PageModel = exports.PageSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Simple schema for multi-language text
const MultiLangTextSchema = new mongoose_1.Schema({
    en: { type: String, default: '' },
    he: { type: String, default: '' },
}, { _id: false });
// Simple schema for multi-language HTML
const MultiLangHTMLSchema = new mongoose_1.Schema({
    en: { type: String, default: '' },
    he: { type: String, default: '' },
}, { _id: false });
exports.PageSchema = new mongoose_1.Schema({
    title: {
        type: MultiLangTextSchema,
        required: true,
    },
    subtitle: {
        type: MultiLangTextSchema,
    },
    alias: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    leadingImage: {
        type: String,
        trim: true,
    },
    introText: {
        type: MultiLangHTMLSchema,
    },
    content: {
        type: MultiLangHTMLSchema,
    },
    category: {
        type: String,
        required: true,
        enum: ['system', 'site'],
        default: 'site',
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
// Update timestamps
exports.PageSchema.pre('save', function () {
    this.updatedAt = new Date();
});
// Indexes for performance
// Note: alias index is automatically created by unique: true, so we don't need to add it again
exports.PageSchema.index({ category: 1 });
exports.PageSchema.index({ isPublished: 1 });
exports.PageModel = mongoose_1.default.models.Page || mongoose_1.default.model('Page', exports.PageSchema);
