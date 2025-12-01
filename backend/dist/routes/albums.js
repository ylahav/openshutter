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
const Album_1 = require("../models/Album");
const Photo_1 = require("../models/Photo");
require("../models/Tag"); // Register Tag model
require("../models/Person"); // Register Person model
require("../models/Location"); // Register Location model
const router = express_1.default.Router();
// Get all albums (hierarchical or flat)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentId = req.query.parentId;
        const query = { isPublic: true }; // Default to public albums only
        if (parentId === 'root' || parentId === 'null') {
            query.parentAlbumId = null;
        }
        else if (parentId) {
            query.parentAlbumId = parentId;
        }
        const albums = yield Album_1.AlbumModel.find(query)
            .sort({ order: 1, createdAt: -1 })
            .populate('coverPhotoId');
        res.json(albums);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
}));
// Get single album by Alias (Legacy compatibility)
router.get('/by-alias/:alias', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { alias } = req.params;
        const album = yield Album_1.AlbumModel.findOne({ alias }).populate('coverPhotoId');
        if (!album) {
            return res.status(404).json({ success: false, error: 'Album not found' });
        }
        res.json({ success: true, data: album });
    }
    catch (error) {
        console.error('[Backend] Error fetching album:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch album' });
    }
}));
// Get photos for an album
router.get('/:id/photos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const query = { albumId: id, isPublished: true };
        const photos = yield Photo_1.PhotoModel.find(query)
            .sort({ uploadedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('tags')
            .populate('people')
            .populate('location');
        const total = yield Photo_1.PhotoModel.countDocuments(query);
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
        console.error('[Backend] Error fetching album photos:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch album photos' });
    }
}));
// Get single album by ID or Alias
router.get('/:idOrAlias', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { idOrAlias } = req.params;
        let album;
        // Check if valid ObjectId
        if (idOrAlias.match(/^[0-9a-fA-F]{24}$/)) {
            album = yield Album_1.AlbumModel.findById(idOrAlias).populate('coverPhotoId');
        }
        // If not found by ID, try alias
        if (!album) {
            album = yield Album_1.AlbumModel.findOne({ alias: idOrAlias }).populate('coverPhotoId');
        }
        if (!album) {
            return res.status(404).json({ success: false, error: 'Album not found' });
        }
        res.json({ success: true, data: album });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch album' });
    }
}));
exports.default = router;
