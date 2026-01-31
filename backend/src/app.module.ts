import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PhotosModule } from './photos/photos.module';
import { AlbumsModule } from './albums/albums.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { SiteConfigController } from './site-config/site-config.controller';
import { StorageController } from './storage/storage.controller';
import { StorageAdminController } from './storage/storage-admin.controller';
import { TemplatesController } from './templates/templates.controller';
import { PeopleModule } from './people/people.module';
import { TagsModule } from './tags/tags.module';
import { LocationsModule } from './locations/locations.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { PagesModule } from './pages/pages.module';
import { BlogCategoriesModule } from './blog-categories/blog-categories.module';
import { BackupModule } from './backup/backup.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DeploymentModule } from './deployment/deployment.module';
import { AdminGuard } from './common/guards/admin.guard';
import { AdminOrOwnerGuard } from './common/guards/admin-or-owner.guard';
import { FaceDetectionModule } from './face-detection/face-detection.module';
import { TranslationsModule } from './translations/translations.module';
import { TemplateBuilderModule } from './template-builder/template-builder.module';
import { SearchModule } from './search/search.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    DatabaseModule,
    PhotosModule,
    AlbumsModule,
    AuthModule,
    PeopleModule,
    TagsModule,
    LocationsModule,
    UsersModule,
    GroupsModule,
    PagesModule,
    BlogCategoriesModule,
    BackupModule,
    AnalyticsModule,
    DeploymentModule,
    FaceDetectionModule,
    TranslationsModule,
    TemplateBuilderModule,
    SearchModule,
  ],
  controllers: [HealthController, SiteConfigController, StorageController, StorageAdminController, TemplatesController],
  providers: [AdminGuard, AdminOrOwnerGuard],
})
export class AppModule {}
