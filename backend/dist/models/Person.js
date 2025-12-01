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
exports.PersonModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PersonSchema = new mongoose_1.Schema({
    firstName: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        validate: {
            validator: function (v) {
                return v && typeof v === 'object' && Object.keys(v).length > 0;
            },
            message: 'First name must be provided in at least one language'
        }
    },
    lastName: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        validate: {
            validator: function (v) {
                return v && typeof v === 'object' && Object.keys(v).length > 0;
            },
            message: 'Last name must be provided in at least one language'
        }
    },
    fullName: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        validate: {
            validator: function (v) {
                return v && typeof v === 'object' && Object.keys(v).length > 0;
            },
            message: 'Full name must be provided in at least one language'
        }
    },
    nickname: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    birthDate: {
        type: Date
    },
    description: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    profileImage: {
        url: String,
        storageProvider: String,
        fileId: String
    },
    faceRecognition: {
        descriptor: [Number], // 128D face descriptor vector
        extractedAt: Date,
        modelVersion: String
    },
    tags: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tag'
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
// Create fullName before saving
PersonSchema.pre('save', function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.firstName && this.lastName) {
            this.fullName = {};
            // Get all languages from both firstName and lastName
            const allLanguages = new Set([
                ...Object.keys(this.firstName),
                ...Object.keys(this.lastName)
            ]);
            // Create fullName for each language
            allLanguages.forEach(lang => {
                const firstName = this.firstName[lang] || '';
                const lastName = this.lastName[lang] || '';
                this.fullName[lang] = `${firstName} ${lastName}`.trim();
            });
        }
    });
});
// Indexes for performance
PersonSchema.index({ firstName: 1, lastName: 1 });
PersonSchema.index({ fullName: 1 });
PersonSchema.index({ nickname: 1 });
PersonSchema.index({ tags: 1 });
PersonSchema.index({ isActive: 1 });
PersonSchema.index({ createdBy: 1 });
// Text search index - using wildcard to index all language fields
PersonSchema.index({
    'firstName.*': 'text',
    'lastName.*': 'text',
    'fullName.*': 'text',
    'nickname.*': 'text',
    'description.*': 'text'
});
exports.PersonModel = mongoose_1.default.models.Person || mongoose_1.default.model('Person', PersonSchema);
