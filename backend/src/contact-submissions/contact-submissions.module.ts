import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactSubmissionsController } from './contact-submissions.controller';
import { ContactSubmissionSchema } from './contact-submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'ContactSubmission', schema: ContactSubmissionSchema }]),
  ],
  controllers: [ContactSubmissionsController],
})
export class ContactSubmissionsModule {}
