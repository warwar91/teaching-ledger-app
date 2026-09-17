import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';

const uploadDir: string = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

// 确保上传目录存在
mkdirSync(uploadDir, { recursive: true });

const multerOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const ext: string = extname(file.originalname).toLowerCase();
      const uniqueName: string = `${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedTypes: string[] = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('只允许上传 JPG/JPEG/PNG 格式图片'), false);
    }
  },
  limits: {
    fileSize: 600 * 1024,
  },
};

@Controller('api/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadImage(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) {
      throw new BadRequestException('未找到上传文件');
    }
    return { url: `/uploads/${file.filename}` };
  }

  @Post('attachment')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const ext: string = extname(file.originalname).toLowerCase();
        const uniqueName: string = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
      const allowedTypes: string[] = [
        'image/jpeg', 'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('只允许上传 JPG/PNG/PDF/Word 格式文件'), false);
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024,
    },
  }))
  uploadAttachment(@UploadedFile() file: Express.Multer.File): { url: string; originalName: string } {
    if (!file) {
      throw new BadRequestException('未找到上传文件');
    }
    // multer 默认以 latin1 解码 multipart 文件名，中文等非 ASCII 字符需转回 UTF-8
    let originalName = file.originalname;
    try {
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      // 只有当解码结果包含可打印的中文字符或与原串不同时才采用
      if (/[\u4e00-\u9fff]/.test(decoded)) {
        originalName = decoded;
      }
    } catch {
      // 忽略解码失败，保留原串
    }
    return { url: `/uploads/${file.filename}`, originalName };
  }
}
