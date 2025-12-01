import express from 'express';
import { PhotoModel } from '../models/Photo';
import { PhotoUploadService } from '../services/photo-upload';
import multer from 'multer';
import '../models/Tag'; // Register Tag model
import '../models/Person'; // Register Person model
import '../models/Location'; // Register Location model

const router = express.Router();
const upload = multer();

// Get all photos
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const photos = await PhotoModel.find({ isPublished: true })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('albumId', 'name alias')
      .populate('uploadedBy', 'name');

    const total = await PhotoModel.countDocuments({ isPublished: true });

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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch photos' });
  }
});

// Get single photo
router.get('/:id', async (req, res) => {
  try {
    const photo = await PhotoModel.findById(req.params.id)
      .populate('albumId')
      .populate('tags')
      .populate('people')
      .populate('location')
      .populate('uploadedBy', 'name username');

    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    res.json({ success: true, data: photo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch photo' });
  }
});

// Upload photo
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { albumId, title, description, tags } = req.body;

    const result = await PhotoUploadService.uploadPhoto(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        albumId,
        title,
        description,
        tags: tags ? JSON.parse(tags) : [],
        // TODO: Get user ID from auth middleware
        // uploadedBy: req.user.id 
      }
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.photo });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

export default router;
