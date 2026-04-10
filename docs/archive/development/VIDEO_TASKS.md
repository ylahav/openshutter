# Video Support Task List

This checklist is scoped to deliver a practical video MVP first, then expand to richer media workflows.

## Milestone 1: Video MVP Core (High Priority)

- [ ] Define video entity/model and schema migration plan
- [ ] Extend upload pipeline to accept video mime types
- [ ] Store and serve videos through existing storage providers
- [ ] Extract basic metadata (duration, resolution, codec, size)
- [ ] Add album listing support for mixed photo/video assets
- [ ] Add basic playback in gallery/lightbox

## Milestone 2: UX and Discoverability (High Priority)

- [ ] Add asset type filter (photos/videos/all)
- [ ] Add video badges and duration overlays on cards
- [ ] Add poster/thumbnail display for videos
- [ ] Add playback controls and keyboard accessibility
- [ ] Ensure mobile playback experience is usable

## Milestone 3: Processing and Reliability (Medium Priority)

- [ ] Background jobs for thumbnail generation
- [ ] Optional transcoding pipeline hook (feature-flagged)
- [ ] Upload limits and validation for large files
- [ ] Progress indicators and retry for failed processing
- [ ] Cleanup and observability for failed jobs

## Milestone 4: Search, Policy, and Governance (Medium Priority)

- [ ] Include video fields in search indexing
- [ ] Add moderation and visibility controls for videos
- [ ] Count video usage in quota/analytics metrics
- [ ] Add audit events for video upload/delete/update

## Technical Backlog (Detailed)

### Backend

- [ ] `Video` model (or unified media model) with references and ownership
- [ ] Upload endpoint updates for validation and storage routing
- [ ] Metadata extraction service integration
- [ ] Media listing APIs supporting asset type filters
- [ ] Optional processing queue workers

### Frontend

- [ ] Upload UI support for video files
- [ ] Album grid card type rendering (image vs video)
- [ ] Lightbox player support and fallback poster
- [ ] Filter controls and search type chips
- [ ] Admin/owner edit page support for video metadata

### Storage and Delivery

- [ ] Validate provider compatibility (local/S3/Drive/etc.)
- [ ] Public/private URL handling for video assets
- [ ] Optional CDN guidance for streaming performance

### Testing

- [ ] Unit tests for metadata extraction and validation
- [ ] Integration tests for upload/list/playback APIs
- [ ] E2E tests for mixed-media albums and filters
- [ ] Performance tests with large video uploads

## Acceptance Criteria (MVP)

- [ ] Users can upload videos into albums.
- [ ] Albums can display mixed photo/video items correctly.
- [ ] Videos play in the main viewer/lightbox with stable controls.
- [ ] Metadata is extracted and visible in API/UI.
- [ ] Role and access controls match existing album/photo rules.
