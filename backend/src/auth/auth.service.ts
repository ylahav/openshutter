import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IUserDocument } from '../models/User';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { storageConfigService } from '../services/storage/config';
import { ownerStorageConfigService } from '../services/storage/owner-storage-config.service';

const SALT_ROUNDS = 10;

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Bootstrap admin — email is fixed; password is generated once and printed to console.
// Used only when no admin exists in the database.
const BOOTSTRAP_ADMIN_EMAIL = 'admin@openshutter.org';
let _bootstrapPassword: string | null = null;

function getBootstrapPassword(): string {
  if (!_bootstrapPassword) {
    _bootstrapPassword = crypto.randomBytes(16).toString('hex');
    // Print once to console so the operator can log in for the first time.
    // The password is only valid until an admin exists in the DB.
    console.log('\n========================================');
    console.log('  OpenShutter first-run bootstrap admin');
    console.log(`  Email:    ${BOOTSTRAP_ADMIN_EMAIL}`);
    console.log(`  Password: ${_bootstrapPassword}`);
    console.log('  Change this password immediately after login.');
    console.log('========================================\n');
  }
  return _bootstrapPassword;
}

@Injectable()
export class AuthService {
  constructor(@InjectModel('User') private userModel: Model<IUserDocument>) {}

  /** Persist successful password-login time (ignored for invalid ids). */
  async recordLastLogin(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    await this.userModel
      .updateOne({ _id: new Types.ObjectId(userId) }, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  private readonly logger = new Logger(AuthService.name);

  async validateUser(email: string, password: string): Promise<any> {
    // Bootstrap initial admin if no admin exists in the database yet
    const existingAdmin = await this.userModel.findOne({ role: 'admin' });
    if (!existingAdmin && email === BOOTSTRAP_ADMIN_EMAIL && password === getBootstrapPassword()) {
      const passwordHash = await hashPassword(password);
      const now = new Date();
      const newUser = await this.userModel.create({
        name: { en: 'System Administrator' },
        username: BOOTSTRAP_ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        groupAliases: [],
        blocked: false,
        createdAt: now,
        updatedAt: now,
      });
      // Invalidate bootstrap password after first use
      _bootstrapPassword = null;
      return {
        id: String(newUser._id),
        email: newUser.username,
        name: (newUser.name && (newUser.name.en || Object.values(newUser.name)[0])) || newUser.username,
        role: newUser.role || 'owner',
      };
    }

    const user = await this.userModel.findOne({ username: email });
    if (!user) {
      return null;
    }

    // Check if user is blocked
    if (user.blocked) {
      return null;
    }

    if (!user.passwordHash) {
      return null;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return null;
    }

    return {
      id: String(user._id),
      email: user.username,
      name: (user.name && (user.name.en || Object.values(user.name)[0])) || user.username,
      role: user.role || 'owner',
      forcePasswordChange: (user as any).forcePasswordChange ?? false,
      groupAliases: Array.isArray((user as any).groupAliases)
        ? (user as any).groupAliases
        : [],
    };
  }

  async getProfile(userId: string): Promise<{ user: any }> {
    const doc = await this.userModel.findById(userId).lean().exec();
    if (!doc) {
      return { user: null };
    }
    const u = doc as any;
    return {
      user: {
        _id: u._id.toString(),
        email: u.username,
        name: u.name || {},
        role: u.role || 'guest',
        forcePasswordChange: u.forcePasswordChange ?? false,
        preferredLanguage: u.preferredLanguage || undefined,
        storageConfig: u.storageConfig || undefined,
        useDedicatedStorage: Boolean(u.useDedicatedStorage),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt ?? undefined,
      },
    };
  }

  async updateProfile(
    userId: string,
    body: {
      name?: Record<string, string> | string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
      bio?: any;
      profileImage?: any;
      preferredLanguage?: string;
      storageConfig?: {
        useAdminConfig?: boolean;
        googleDrive?: {
          rootFolderId?: string;
          sharedDriveId?: string;
          folderPrefix?: string;
          authMethod?: string;
          clientId?: string;
          clientSecret?: string;
          refreshToken?: string;
          storageType?: string;
          folderId?: string;
          serviceAccountJson?: string;
        };
        wasabi?: {
          endpoint?: string;
          bucketName?: string;
          region?: string;
          accessKeyId?: string;
          secretAccessKey?: string;
        };
      };
    },
  ): Promise<{ user: any }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return { user: null };
    }

    if (body.name !== undefined) {
      user.name = typeof body.name === 'string' ? { en: body.name } : body.name;
    }
    if (body.email !== undefined && body.email.trim() !== '') {
      user.username = body.email.trim().toLowerCase();
    }
    if (body.preferredLanguage !== undefined) {
      user.preferredLanguage = body.preferredLanguage?.trim() || '';
    }
    if (body.storageConfig !== undefined) {
      user.storageConfig = body.storageConfig;
    }

    if (body.newPassword && body.newPassword.length >= 6) {
      if (!body.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const ok = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!ok) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.passwordHash = await hashPassword(body.newPassword);
      user.forcePasswordChange = false;
    }

    await user.save();

    const updated = await this.userModel.findById(userId).lean().exec();
    const u = updated as any;
    return {
      user: {
        _id: u._id.toString(),
        email: u.username,
        name: u.name || {},
        role: u.role || 'guest',
        forcePasswordChange: u.forcePasswordChange ?? false,
        preferredLanguage: u.preferredLanguage || undefined,
        storageConfig: u.storageConfig || undefined,
        useDedicatedStorage: Boolean(u.useDedicatedStorage),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt ?? undefined,
      },
    };
  }

  /**
   * Get storage options for the current user (enabled providers they are allowed to use).
   * Admin sees all enabled; owner/guest see only providers in their allowedStorageProviders.
   * Owners with useDedicatedStorage see their `owner_storage_configs` rows (intersect allowed).
   */
  async getStorageOptions(userId: string): Promise<{ success: true; data: Array<{ id: string; name: string; type: string; isEnabled: boolean }> }> {
    const doc = await this.userModel
      .findById(userId)
      .select('allowedStorageProviders role useDedicatedStorage')
      .lean()
      .exec();
    if (!doc) {
      return { success: true, data: [] };
    }
    const u = doc as any;
    const role = u.role || 'guest';
    const allowed: string[] = Array.isArray(u.allowedStorageProviders) ? u.allowedStorageProviders : [];

    if (role === 'owner' && u.useDedicatedStorage) {
      const rows = await ownerStorageConfigService.listByOwner(userId);
      const rowById = new Map(rows.map((r) => [r.providerId, r]));
      const label: Record<string, string> = {
        local: 'Local Storage',
        'google-drive': 'Google Drive',
        'aws-s3': 'AWS S3',
        backblaze: 'Backblaze',
        wasabi: 'Wasabi',
      };
      // One tab per allowed provider so owners can save an initial row (upsert) even before DB rows exist
      const options = allowed.map((providerId) => {
        if (providerId === 'local') {
          return { id: 'local', name: 'Local Storage', type: 'local', isEnabled: true };
        }
        const row = rowById.get(providerId as (typeof rows)[0]['providerId']);
        if (row) {
          return {
            id: row.providerId,
            name: row.name || label[row.providerId] || row.providerId,
            type: row.providerId,
            isEnabled: row.isEnabled !== false,
          };
        }
        return {
          id: providerId,
          name: label[providerId] || providerId,
          type: providerId,
          isEnabled: false,
        };
      });
      return { success: true, data: options };
    }

    const configs = await storageConfigService.getAllConfigs();
    let options = configs
      .filter((c: any) => c.isEnabled !== false && (role === 'admin' || allowed.includes(c.providerId)))
      .map((c: any) => ({
        id: c.providerId,
        name: c.name || c.providerId,
        type: c.providerId,
        isEnabled: true,
      }));

    if (options.length === 0 && (role === 'admin' || allowed.includes('local'))) {
      options = [{ id: 'local', name: 'Local Storage', type: 'local', isEnabled: true }];
    }

    return { success: true, data: options };
  }
}
