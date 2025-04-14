import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileuploadService } from './fileupload.service';
import { diskStorage } from 'multer';
import { nanoid } from 'nanoid';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('fileupload')
export class FileuploadController {
  constructor(private readonly fileuploadService: FileuploadService) {}

  @Post('promotion-banner')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${nanoid()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 1024 * 1024 * 50 }, // 50MB 제한
    }),
  )
  async uploadPromotionBanner(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; promotionBannerId: number },
  ) {}
}
