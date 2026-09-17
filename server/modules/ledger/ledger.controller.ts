import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { CurrentUser } from '@server/modules/auth/current-user.decorator';
import { LedgerService } from './ledger.service';
import {
  CreateLedgerDto,
  CreateRecordsDto,
  UpdateRecordDto,
  BatchDeleteDto,
} from './dto/ledger.dto';
import type {
  LedgerItem,
  LedgerDetail,
  LedgerRecordItem,
  ReminderItem,
} from '@shared/api.interface';

@UseGuards(JwtAuthGuard)
@Controller('api/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('list')
  async getLedgerList(
    @CurrentUser('userId') userId: string,
    @Query('type') type?: string,
    @Query('semester') semester?: string,
  ): Promise<LedgerItem[]> {
    return this.ledgerService.getLedgerList(
      userId,
      type as 'weekly' | 'semester' | undefined,
      semester,
    );
  }

  @Post('create')
  async createLedger(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLedgerDto,
  ): Promise<LedgerItem> {
    return this.ledgerService.createLedger(userId, dto);
  }

  @Get('recycle/list')
  async getRecycleList(
    @CurrentUser('userId') userId: string,
  ): Promise<LedgerItem[]> {
    return this.ledgerService.getRecycleList(userId);
  }

  @Post('recycle/restore/:id')
  async restoreLedger(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.restoreLedger(userId, id);
    return { success: true };
  }

  @Delete('recycle/permanent/:id')
  async permanentDeleteLedger(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.permanentDeleteLedger(userId, id);
    return { success: true };
  }

  @Post('batch-delete')
  async batchDeleteLedgers(
    @CurrentUser('userId') userId: string,
    @Body() dto: BatchDeleteDto,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.batchDeleteLedgers(userId, dto.ids);
    return { success: true };
  }

  @Get('reminders/pending')
  async getPendingReminders(
    @CurrentUser('userId') userId: string,
  ): Promise<ReminderItem[]> {
    return this.ledgerService.getPendingReminders(userId);
  }

  @Get('export/:ledgerId')
  async exportLedger(
    @CurrentUser('userId') userId: string,
    @Param('ledgerId') ledgerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, buffer } = await this.ledgerService.exportLedger(userId, ledgerId);
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

  @Get(':id')
  async getLedgerDetail(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<LedgerDetail> {
    return this.ledgerService.getLedgerDetail(userId, id);
  }

  @Delete(':id')
  async deleteLedger(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.deleteLedger(userId, id);
    return { success: true };
  }

  @Patch(':id/rename')
  async renameLedger(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.ledgerService.renameLedger(userId, id, body.name);
  }

  @Post(':id/records')
  async createRecords(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateRecordsDto,
  ): Promise<LedgerRecordItem[]> {
    return this.ledgerService.createRecords(userId, id, dto);
  }

  @Patch('record/:recordId')
  async updateRecord(
    @CurrentUser('userId') userId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateRecordDto,
  ): Promise<LedgerRecordItem> {
    return this.ledgerService.updateRecord(userId, recordId, dto);
  }

  @Delete('record/:recordId')
  async deleteRecord(
    @CurrentUser('userId') userId: string,
    @Param('recordId') recordId: string,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.deleteRecord(userId, recordId);
    return { success: true };
  }

  @Post('record/:recordId/skip-reminder')
  async skipReminder(
    @CurrentUser('userId') userId: string,
    @Param('recordId') recordId: string,
  ): Promise<{ success: boolean }> {
    await this.ledgerService.skipReminder(userId, recordId);
    return { success: true };
  }
}
