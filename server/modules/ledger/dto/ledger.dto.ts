import {
  IsString,
  IsNotEmpty,
  IsIn,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  ValidateNested,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLedgerDto {
  @IsString()
  @IsNotEmpty({ message: '台账名称不能为空' })
  @MaxLength(255, { message: '台账名称不能超过255个字符' })
  name: string;

  @IsString()
  @IsIn(['weekly', 'semester'], { message: '台账类型必须是 weekly 或 semester' })
  ledgerType: 'weekly' | 'semester';
}

export class UpdateRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: '内容不能超过5000个字符' })
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '备注不能超过1000个字符' })
  remark?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: '每条记录最多上传2张图片' })
  @IsString({ each: true, message: '图片链接必须是字符串' })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  expectedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '执行人名称不能超过255个字符' })
  mainExecutor?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_progress', 'completed'], { message: '进度状态无效' })
  progressStatus?: 'pending' | 'in_progress' | 'completed';

  @IsOptional()
  @IsBoolean()
  skipReminder?: boolean;
}

export class CreateRecordItemDto {
  @IsString()
  @IsNotEmpty({ message: '记录内容不能为空' })
  @MaxLength(5000, { message: '内容不能超过5000个字符' })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '备注不能超过1000个字符' })
  remark?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: '每条记录最多上传2张图片' })
  @IsString({ each: true, message: '图片链接必须是字符串' })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  expectedDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '执行人名称不能超过255个字符' })
  mainExecutor?: string | null;
}

export class CreateRecordsDto {
  @IsArray()
  @ArrayMaxSize(100, { message: '一次最多添加100条记录' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecordItemDto)
  records: CreateRecordItemDto[];
}

export class BatchDeleteDto {
  @IsArray()
  @ArrayMaxSize(50, { message: '一次最多删除50个台账' })
  @IsString({ each: true, message: '台账ID必须是字符串' })
  ids: string[];
}
