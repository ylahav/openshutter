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
const express_1 = __importDefault(require("express"));
const Photo_1 = require("../models/Photo");
const photo_upload_1 = require("../services/photo-upload");
const multer_1 = __importDefault(require("multer"));
require("../models/Tag"); // Register Tag model
require("../models/Person"); // Register Person model
require("../models/Location"); // Register Location model
const router = express_1.default.Router();
const upload = (0, multer_1.default)();
// Get all photos
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const photos = yield Photo_1.PhotoModel.find({ isPublished: true })
            .sort({ uploadedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('albumId', 'name alias')
            .populate('uploadedBy', 'name');
        const total = yield Photo_1.PhotoModel.countDocuments({ isPublished: true });
        res.json({
            success: true,
            data: {
                photos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch photos' });
    }
}));
// Get single photo
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const photo = yield Photo_1.PhotoModel.findById(req.params.id)
            .populate('albumId')
            .populate('tags')
            .populate('people')
            .populate('location')
            .populate('uploadedBy', 'name username');
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' });
        }
        res.json({ success: true, data: photo });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch photo' });
    }
}));
// Upload photo
router.post('/upload', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const { albumId, title, description, tags } = req.body;
        const result = yield photo_upload_1.PhotoUploadService.uploadPhoto(req.file.buffer, req.file.originalname, req.file.mimetype, {
            albumId,
            title,
            description,
            tags: tags ? JSON.parse(tags) : [],
            // TODO: Get user ID from auth middleware
            // uploadedBy: req.user.id 
        });
        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error });
        }
        res.status(201).json({ success: true, data: result.photo });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
}));
exports.default = router;
