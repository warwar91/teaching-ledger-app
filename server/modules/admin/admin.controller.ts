import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import type {
  AdminUserItem,
  LedgerItem,
  LedgerDetail,
} from '@shared/api.interface';

@UseGuards(AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(): Promise<AdminUserItem[]> {
    return this.adminService.getUsers();
  }

  @Get('users/:userId/ledgers')
  async getUserLedgers(
    @Param('userId') userId: string,
    @Query('type') type?: string,
  ): Promise<LedgerItem[]> {
    return this.adminService.getUserLedgers(
      userId,
      type as 'weekly' | 'semester' | undefined,
    );
  }

  @Get('ledgers/:id')
  async getLedgerDetail(@Param('id') id: string): Promise<LedgerDetail> {
    return this.adminService.getLedgerDetail(id);
  }

  @Delete('users/:userId/data')
  async deleteUserData(
    @Param('userId') userId: string,
  ): Promise<{ deletedLedgers: number }> {
    return this.adminService.deleteUserData(userId);
  }

  @Post('users/:userId/reset-password')
  async resetPassword(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const adminUserId = (req as { user?: { userId: string } }).user?.userId ?? '';
    return this.adminService.resetPassword(adminUserId, userId, dto.newPassword);
  }

  @Delete('users/:userId')
  async deleteUser(
    @Req() req: Request,
    @Param('userId') userId: string,
    @Body() dto: DeleteUserDto,
  ): Promise<{
    userId: string;
    username: string;
    deletedLedgers: number;
    deletedRecords: number;
    deletedSessions: number;
    deletedLoginAttempts: number;
  }> {
    if (!dto.confirm) {
      throw new BadRequestException('请确认删除操作');
    }
    const adminUserId = (req as { user?: { userId: string } }).user?.userId ?? '';
    return this.adminService.deleteUser(adminUserId, userId);
  }

  @Get('export/:ledgerId')
  async exportLedger(
    @Param('ledgerId') ledgerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.adminService.exportLedger(ledgerId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
    );
    res.send(buffer);
  }
}
