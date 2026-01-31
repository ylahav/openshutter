import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserDocument } from '../models/User';
import * as bcrypt from 'bcryptjs';
import { storageConfigService } from '../services/storage/config';

const SALT_ROUNDS = 10;

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Initial admin user configuration
const INITIAL_ADMIN_CREDENTIALS = {
  email: 'admin@openshutter.org',
  password: 'admin123!',
  name: 'System Administrator',
  role: 'admin' as const,
};

function isInitialAdmin(email: string, password: string): boolean {
  return (
    email === INITIAL_ADMIN_CREDENTIALS.email &&
    password === INITIAL_ADMIN_CREDENTIALS.password
  );
}

function getInitialAdminUser() {
  return {
    _id: 'initial-admin',
    email: INITIAL_ADMIN_CREDENTIALS.email,
    name: INITIAL_ADMIN_CREDENTIALS.name,
    role: INITIAL_ADMIN_CREDENTIALS.role,
  };
}

@Injectable()
export class AuthService {
  constructor(@InjectModel('User') private userModel: Model<IUserDocument>) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Bootstrap initial admin if needed
    const existingAdmin = await this.userModel.findOne({ role: 'admin' });
    if (!existingAdmin && isInitialAdmin(email, password)) {
      const initial = getInitialAdminUser();
      const passwordHash = await hashPassword(password);
      const now = new Date();
      const newUser = await this.userModel.create({
        name: { en: initial.name },
        username: initial.email,
        passwordHash,
        role: 'admin',
        groupAliases: [],
        blocked: false,
        createdAt: now,
        updatedAt: now,
      });
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
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
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

    if (body.newPassword && body.newPassword.length >= 6) {
      if (!body.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const ok = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!ok) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.passwordHash = await hashPassword(body.newPassword);
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
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      },
    };
  }

  /**
   * Get storage options for the current user (enabled providers they are allowed to use).
   * Admin sees all enabled; owner/guest see only providers in their allowedStorageProviders.
   */
  async getStorageOptions(userId: string): Promise<{ success: true; data: Array<{ id: string; name: string; type: string; isEnabled: boolean }> }> {
    const doc = await this.userModel.findById(userId).select('allowedStorageProviders role').lean().exec();
    if (!doc) {
      return { success: true, data: [] };
    }
    const u = doc as any;
    const role = u.role || 'guest';
    const allowed: string[] = Array.isArray(u.allowedStorageProviders) ? u.allowedStorageProviders : [];

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
