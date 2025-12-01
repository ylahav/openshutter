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
exports.BlogArticleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BlogArticleSchema = new mongoose_1.Schema({
    title: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    leadingImage: {
        url: String,
        alt: mongoose_1.Schema.Types.Mixed,
        storageProvider: {
            type: String,
            enum: ['google-drive', 'aws-s3', 'local'],
            default: 'local'
        },
        storagePath: String
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
            type: String,
            trim: true
        }],
    content: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
    excerpt: {
        type: mongoose_1.Schema.Types.Mixed
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    authorId: {
        type: String,
        required: true
    },
    publishedAt: {
        type: Date
    },
    viewCount: {
        type: Number,
        default: 0
    },
    seoTitle: {
        type: mongoose_1.Schema.Types.Mixed
    },
    seoDescription: {
        type: mongoose_1.Schema.Types.Mixed
    }
}, {
    timestamps: true
});
// Update timestamps
BlogArticleSchema.pre('save', function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.updatedAt = new Date();
        // Set publishedAt when article is published
        if (this.isPublished && !this.publishedAt) {
            this.publishedAt = new Date();
        }
    });
});
// Indexes for performance
// Note: slug index is automatically created by unique: true in schema
BlogArticleSchema.index({ authorId: 1 });
BlogArticleSchema.index({ category: 1 });
BlogArticleSchema.index({ tags: 1 });
BlogArticleSchema.index({ isPublished: 1 });
BlogArticleSchema.index({ isFeatured: 1 });
BlogArticleSchema.index({ publishedAt: -1 });
BlogArticleSchema.index({ createdAt: -1 });
// Method to generate slug from title
BlogArticleSchema.methods.generateSlug = function (title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
};
// Method to increment view count
BlogArticleSchema.methods.incrementViewCount = function () {
    this.viewCount += 1;
    return this.save();
};
// Static method to find published articles
BlogArticleSchema.statics.findPublished = function () {
    return this.find({ isPublished: true }).sort({ publishedAt: -1 });
};
// Static method to find by category
BlogArticleSchema.statics.findByCategory = function (category) {
    return this.find({ category, isPublished: true }).sort({ publishedAt: -1 });
};
// Static method to find by author
BlogArticleSchema.statics.findByAuthor = function (authorId) {
    return this.find({ authorId }).sort({ createdAt: -1 });
};
exports.BlogArticleModel = mongoose_1.default.models.BlogArticle ||
    mongoose_1.default.model('BlogArticle', BlogArticleSchema);
