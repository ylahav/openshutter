import type { MultiLangText } from '$lib/types/multi-lang';

export interface Group {
	_id: string;
	alias: string;
	name: MultiLangText | string;
}

export interface User {
	_id: string;
	name: MultiLangText | string;
	username: string;
	role: 'admin' | 'owner' | 'guest';
	groupAliases?: string[];
	blocked?: boolean;
	forcePasswordChange?: boolean;
	preferredLanguage?: string;
	allowedStorageProviders?: string[];
	storageConfig?: {
		useAdminConfig?: boolean;
		googleDrive?: { rootFolderId?: string; sharedDriveId?: string; folderPrefix?: string };
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface OwnerDomain {
	id: string;
	hostname: string;
	active: boolean;
	isPrimary: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface UserFormData {
	name: MultiLangText;
	username: string;
	password: string;
	role: 'admin' | 'owner' | 'guest';
	preferredLanguage: string;
	groupAliases: string[];
	blocked: boolean;
	forcePasswordChange: boolean;
	allowedStorageProviders: string[];
	storageUseAdminConfig: boolean;
}
