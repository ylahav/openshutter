import express from 'express';
import { AlbumModel } from '../models/Album';
import { PhotoModel } from '../models/Photo';
import '../models/Tag'; // Register Tag model
import '../models/Person'; // Register Person model
import '../models/Location'; // Register Location model

const router = express.Router();

// Get all albums (hierarchical or flat)
router.get('/', async (req, res) => {
  try {
    const parentId = req.query.parentId as string;
    const query: any = { isPublic: true }; // Default to public albums only

    if (parentId === 'root' || parentId === 'null') {
      query.parentAlbumId = null;
    } else if (parentId) {
      query.parentAlbumId = parentId;
    }

    const albums = await AlbumModel.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('coverPhotoId');

    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Get single album by Alias (Legacy compatibility)
router.get('/by-alias/:alias', async (req, res) => {
  try {
    const { alias } = req.params;
    
    const album = await AlbumModel.findOne({ alias }).populate('coverPhotoId');

    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    res.json({ success: true, data: album });
  } catch (error) {
    console.error('[Backend] Error fetching album:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch album' });
  }
});

// Get photos for an album
router.get('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query = { albumId: id, isPublished: true };

    const photos = await PhotoModel.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tags')
      .populate('people')
      .populate('location');

    const total = await PhotoModel.countDocuments(query);

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
    console.error('[Backend] Error fetching album photos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch album photos' });
  }
});

// Get single album by ID or Alias
router.get('/:idOrAlias', async (req, res) => {
  try {
    const { idOrAlias } = req.params;
    let album;

    // Check if valid ObjectId
    if (idOrAlias.match(/^[0-9a-fA-F]{24}$/)) {
      album = await AlbumModel.findById(idOrAlias).populate('coverPhotoId');
    }

    // If not found by ID, try alias
    if (!album) {
      album = await AlbumModel.findOne({ alias: idOrAlias }).populate('coverPhotoId');
    }

    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    res.json({ success: true, data: album });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch album' });
  }
});

export default router;
