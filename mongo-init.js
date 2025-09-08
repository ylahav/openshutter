// MongoDB initialization script for OpenShutter
// This script runs when the MongoDB container starts for the first time

// Switch to the openshutter database
db = db.getSiblingDB('openshutter');

// Create the initial admin user
db.createUser({
  user: 'openshutter',
  pwd: 'openshutter123',
  roles: [
    {
      role: 'readWrite',
      db: 'openshutter'
    }
  ]
});

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('albums');
db.createCollection('photos');
db.createCollection('storageconfigs');
db.createCollection('siteconfigs');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.albums.createIndex({ alias: 1 }, { unique: true });
db.albums.createIndex({ parentAlbumId: 1 });
db.albums.createIndex({ isPublic: 1 });
db.albums.createIndex({ isFeatured: 1 });
db.photos.createIndex({ albumId: 1 });
db.photos.createIndex({ isPublished: 1 });
db.photos.createIndex({ isLeading: 1 });
db.photos.createIndex({ isGalleryLeading: 1 });
db.photos.createIndex({ 'storage.fileId': 1 });
db.storageconfigs.createIndex({ provider: 1 }, { unique: true });
db.siteconfigs.createIndex({ key: 1 }, { unique: true });

print('OpenShutter database initialized successfully!');
print('Admin user created: openshutter / openshutter123');
print('Collections and indexes created.');
