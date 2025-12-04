"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("./database/database.module");
const photos_module_1 = require("./photos/photos.module");
const albums_module_1 = require("./albums/albums.module");
const auth_module_1 = require("./auth/auth.module");
const health_controller_1 = require("./health/health.controller");
const site_config_controller_1 = require("./site-config/site-config.controller");
const storage_controller_1 = require("./storage/storage.controller");
const storage_admin_controller_1 = require("./storage/storage-admin.controller");
const templates_controller_1 = require("./templates/templates.controller");
const people_module_1 = require("./people/people.module");
const tags_module_1 = require("./tags/tags.module");
const locations_module_1 = require("./locations/locations.module");
const users_module_1 = require("./users/users.module");
const groups_module_1 = require("./groups/groups.module");
const pages_module_1 = require("./pages/pages.module");
const blog_categories_module_1 = require("./blog-categories/blog-categories.module");
const backup_module_1 = require("./backup/backup.module");
const analytics_module_1 = require("./analytics/analytics.module");
const deployment_module_1 = require("./deployment/deployment.module");
const admin_guard_1 = require("./common/guards/admin.guard");
const photos_admin_controller_1 = require("./photos/photos-admin.controller");
const face_detection_module_1 = require("./face-detection/face-detection.module");
const configuration_1 = __importDefault(require("./config/configuration"));
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [configuration_1.default],
            }),
            database_module_1.DatabaseModule,
            photos_module_1.PhotosModule,
            albums_module_1.AlbumsModule,
            auth_module_1.AuthModule,
            people_module_1.PeopleModule,
            tags_module_1.TagsModule,
            locations_module_1.LocationsModule,
            users_module_1.UsersModule,
            groups_module_1.GroupsModule,
            pages_module_1.PagesModule,
            blog_categories_module_1.BlogCategoriesModule,
            backup_module_1.BackupModule,
            analytics_module_1.AnalyticsModule,
            deployment_module_1.DeploymentModule,
            face_detection_module_1.FaceDetectionModule,
        ],
        controllers: [health_controller_1.HealthController, site_config_controller_1.SiteConfigController, storage_controller_1.StorageController, storage_admin_controller_1.StorageAdminController, templates_controller_1.TemplatesController, photos_admin_controller_1.PhotosAdminController],
        providers: [admin_guard_1.AdminGuard],
    })
], AppModule);
