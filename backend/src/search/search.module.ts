import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AlbumsModule } from '../albums/albums.module';
import { UserSchema } from '../models/User';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';

@Module({
	imports: [
		AlbumsModule,
		MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
	],
	controllers: [SearchController],
	providers: [SearchService, OptionalAdminGuard],
	exports: [SearchService],
})
export class SearchModule {}
