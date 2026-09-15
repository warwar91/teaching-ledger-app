import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { AdminGuard } from '@server/modules/admin/admin.guard';

@Controller('api/announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // 普通用户：查看已发布公告列表（分页）
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = parseInt(page || '1', 10) || 1;
    const ps = parseInt(pageSize || '12', 10) || 12;
    return this.announcementService.findAll(p, ps);
  }

  // 管理员：查看所有公告（含未发布）—— 必须在 :id 路由之前注册
  @Get('admin/all')
  @UseGuards(AdminGuard)
  adminFindAll() {
    return this.announcementService.adminFindAll();
  }

  // 普通用户：获取自己的台账文件夹列表（用于添加到台账功能）
  @Get('my-ledgers')
  @UseGuards(JwtAuthGuard)
  getUserLedgers(@Req() req: any) {
    return this.announcementService.getUserLedgers(req.user.userId);
  }

  // 普通用户：查看公告详情
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    const requirePublished = req.user?.role !== 'admin';
    return this.announcementService.findOne(id, requirePublished);
  }

  // 管理员：创建公告
  @Post()
  @UseGuards(AdminGuard)
  create(
    @Body() body: {
      title: string;
      content?: string;
      publisher?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      announcementType?: string;
      items?: Array<{ content: string; deadline?: string }>;
    },
    @Req() req: any,
  ) {
    return this.announcementService.create({
      ...body,
      content: body.content || '',
      createdBy: req.user?.userId,
    });
  }

  // 普通用户：将台账公告中的条目添加到自己的台账
  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  claim(
    @Param('id') id: string,
    @Body() body: {
      itemIds: string[];
      targetLedgerId: string;
      expectedDate?: string;
      mainExecutor?: string;
      remark?: string;
    },
    @Req() req: any,
  ) {
    return this.announcementService.claimItems(
      req.user.userId,
      id,
      body.itemIds,
      body.targetLedgerId,
      {
        expectedDate: body.expectedDate,
        mainExecutor: body.mainExecutor,
        remark: body.remark,
      }
    );
  }

  // 管理员：编辑公告
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      content?: string;
      publisher?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      isPublished?: boolean;
      items?: Array<{ id?: string; content: string; deadline?: string }>;
    },
    @Req() req: any,
  ) {
    return this.announcementService.update(id, {
      ...body,
      updatedBy: req.user?.userId,
    });
  }

  // 管理员：删除公告
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }
}
