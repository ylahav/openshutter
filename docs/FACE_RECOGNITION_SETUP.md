# Face Recognition Setup Guide

This guide explains how to set up face recognition functionality in OpenShutter.

## Overview

OpenShutter uses `face-api.js` for face detection and recognition. The system can:
- Detect faces in photos
- Extract face descriptors (128D vectors)
- Match faces against known people
- Auto-tag photos with recognized people

## Prerequisites

1. **face-api.js models**: You need to download and place the pre-trained models in your project
2. **Node.js canvas**: Required for server-side processing (already installed)

## Step 1: Download face-api.js Models

The face-api.js library requires pre-trained models. Download them from:

**Option 1: Direct Download**
- Visit: https://github.com/justadudewhohacks/face-api.js-models
- Download the following models:
  - `tiny_face_detector_model-weights_manifest.json` and `.shard` files
  - `face_landmark_68_model-weights_manifest.json` and `.shard` files
  - `face_recognition_model-weights_manifest.json` and `.shard` files

**Option 2: Using Git Clone**
```bash
# Clone the models repository
git clone https://github.com/justadudewhohacks/face-api.js-models.git

# Copy the three required model folders to public directory
# On Windows (PowerShell):
mkdir -p public/models/face-api
Copy-Item -Path "face-api.js-models\tiny_face_detector" -Destination "public\models\face-api\" -Recurse
Copy-Item -Path "face-api.js-models\face_landmark_68" -Destination "public\models\face-api\" -Recurse
Copy-Item -Path "face-api.js-models\face_recognition" -Destination "public\models\face-api\" -Recurse

# On Linux/Mac:
mkdir -p public/models/face-api
cp -r face-api.js-models/tiny_face_detector public/models/face-api/
cp -r face-api.js-models/face_landmark_68 public/models/face-api/
cp -r face-api.js-models/face_recognition public/models/face-api/
```

## Step 2: Place Models in Public Directory

Copy the three required model folders from the cloned repository to: `public/models/face-api/`

**Important:** The models are directly in the repository root (not in a `weights` folder). You need to copy these three folders:
- `tiny_face_detector/`
- `face_landmark_68/`
- `face_recognition/`

Your final directory structure should look like:
```
public/
  models/
    face-api/
      tiny_face_detector/
        tiny_face_detector_model-weights_manifest.json
        tiny_face_detector_model-shard1
      face_landmark_68/
        face_landmark_68_model-weights_manifest.json
        face_landmark_68_model-shard1
      face_recognition/
        face_recognition_model-weights_manifest.json
        face_recognition_model-shard1
        face_recognition_model-shard2
```

## Step 3: Initialize Face Recognition for People

Before face matching can work, you need to extract face descriptors from people's profile images:

1. Go to **Admin → People**
2. For each person with a profile image:
   - Click on the person
   - Use the "Extract Face Descriptor" button (if available)
   - Or use the API endpoint: `POST /api/admin/face-recognition/person-descriptor`

## Step 4: Using Face Recognition

### In Photo Edit Page

1. Navigate to **Admin → Albums → [Album] → [Photo] → Edit**
2. Scroll to the **Face Recognition** section
3. Click **"Expand"** to show face recognition controls
4. Click **"Detect Faces"** to detect faces in the photo
   - Detected faces will appear as bounding boxes on the image
   - Auto-detected faces have a blue border
   - You can manually select faces by clicking and dragging on the image
   - Manually selected faces have a green border
   - Selected faces can be resized or deleted
5. Click **"Match Faces"** to automatically match detected faces with known people
   - Matched faces will show the person's name
   - Confidence scores are displayed for each match
6. **Manual Assignment**: Use the dropdown next to each face to manually assign it to a person
7. Matched faces will automatically tag the photo with the recognized people

### Bulk Face Detection at Album Level

1. Navigate to **Admin → Albums → [Album]**
2. In the **Actions** section, click **"Detect Faces in All Photos"**
3. A confirmation dialog will appear asking to confirm the operation
4. Click **"Start Detection"** to begin processing all photos in the album
5. The system will:
   - Detect faces in each photo
   - Automatically match faces to known people
   - Store only matched faces (faces without matches are removed)
   - Show progress notifications during processing

**Note**: Bulk detection processes photos sequentially and may take a while for large albums.

### Frontend Album View

Face detection results are displayed in the frontend album view:

1. Navigate to any public album page
2. Click on a photo to open the lightbox
3. Click the **👥** button to toggle face detection overlay
4. Detected faces will show:
   - Green bounding boxes for matched faces (with person names)
   - Orange bounding boxes for unmatched faces
5. Matched people are also listed in the photo info panel

### API Endpoints

- `POST /api/admin/face-recognition/detect` - Detect faces in a photo
  ```json
  {
    "photoId": "photo_id_here",
    "faces": [
      {
        "descriptor": [128D array],
        "box": { "x": 100, "y": 150, "width": 200, "height": 250 },
        "landmarks": [...],
        "matchedPersonId": "person_id_here", // optional
        "confidence": 0.85 // optional
      }
    ],
    "onlyMatched": false // optional: if true, only store faces with matchedPersonId
  }
  ```
  **Note**: This endpoint receives client-side detection results. Face detection is performed in the browser.

- `POST /api/admin/face-recognition/match` - Match faces against known people
  ```json
  {
    "photoId": "photo_id_here",
    "threshold": 0.6
  }
  ```
  Returns matched faces with person IDs and confidence scores. Automatically updates photo.people array.

- `POST /api/admin/face-recognition/assign` - Manually assign a face to a person
  ```json
  {
    "photoId": "photo_id_here",
    "faceIndex": 0,
    "personId": "person_id_here"
  }
  ```
  Manually assigns a detected face to a person and updates photo.people array.

- `POST /api/admin/face-recognition/person-descriptor` - Extract face descriptor from person's profile image
  ```json
  {
    "personId": "person_id_here",
    "imageUrl": "url_to_profile_image"
  }
  ```
  Extracts face descriptor from a person's profile image for matching.

## Configuration

### Matching Threshold

The default matching threshold is `0.6`. Lower values mean stricter matching (fewer false positives, but may miss some matches). Higher values mean more lenient matching (more matches, but may include false positives).

You can adjust the threshold in:
- API calls: `threshold` parameter (0.0 - 1.0)
- Client-side: Modify `FaceRecognitionService.findBestMatch()` threshold parameter

### Model Loading

Models are loaded automatically when:
- Client-side: When `FaceRecognitionService.loadModels()` is called
- Server-side: When `FaceRecognitionServerService.loadModels()` is called

Models are cached after first load to improve performance.

## Troubleshooting

### Models Not Loading

**Error**: "Failed to load face recognition models"

**Solutions**:
1. Verify models are in `public/models/face-api/`
2. Check file names match exactly (case-sensitive)
3. Ensure all `.shard` files are present
4. Check browser console for specific loading errors

### No Faces Detected

**Possible causes**:
1. Image quality too low
2. Faces too small in image
3. Poor lighting or angle
4. Models not loaded properly

**Solutions**:
- Use higher resolution images
- Ensure faces are clearly visible
- Try different photos

### Poor Matching Accuracy

**Solutions**:
1. Ensure people have good quality profile images
2. Profile images should show a single, clear face
3. Adjust matching threshold
4. Re-extract face descriptors for people

### Server-Side Processing Issues

**Error**: "Failed to load face recognition models (server-side)"

**Solutions**:
1. Ensure models are accessible from server
2. Check file permissions
3. Verify `canvas` package is installed correctly
4. Check server logs for detailed errors

## Performance Considerations

- **Model Size**: Models total ~5-6 MB
- **Detection Time**: ~100-500ms per image (depending on image size and number of faces)
- **Matching Time**: ~10-50ms per face (depending on number of known people)
- **Client vs Server**: Client-side is faster for single photos, server-side better for batch processing

## Security & Privacy

- Face descriptors are stored in the database
- Descriptors cannot be reverse-engineered to recreate faces
- Only admins and owners can access face recognition features
- Face data is not exposed in public APIs

## Features

### Manual Face Selection
- Click and drag on the image to manually select face regions
- Manually selected faces have a green border (vs blue for auto-detected)
- Resize faces by dragging the corners
- Delete faces by clicking the delete button
- Visual legend explains the color coding

### Face Matching
- Automatic matching against known people with configurable threshold
- Manual assignment via dropdown for each detected face
- Confidence scores displayed for automatic matches
- Matched people automatically added to photo.people array

### Bulk Operations
- Detect faces in all photos of an album with one click
- Automatic matching and filtering (only matched faces are stored)
- Progress notifications during bulk processing
- Confirmation dialog before starting bulk operations

### Frontend Display
- Face detection overlay in photo lightbox (toggle with 👥 button)
- Color-coded bounding boxes (green for matched, orange for unmatched)
- Person names displayed on matched faces
- Matched people listed in photo info panel

## Future Enhancements

Potential improvements:
- Automatic face detection on upload
- Face clustering (group similar faces)
- Face search across all photos
- Improved accuracy with larger models
- Face similarity grouping
