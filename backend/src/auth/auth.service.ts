import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserDocument } from '../models/User';
import * as bcrypt from 'bcryptjs';

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
}

