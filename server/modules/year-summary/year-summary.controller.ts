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
import { YearSummaryService } from './year-summary.service';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { AdminGuard } from '@server/modules/admin/admin.guard';

@Controller('api/year-summaries')
@UseGuards(JwtAuthGuard)
export class YearSummaryController {
  constructor(private readonly yearSummaryService: YearSummaryService) {}

  @Get('years')
  getYears() {
    return this.yearSummaryService.getAcademicYears();
  }

  @Get()
  list(@Query('year') year: string, @Req() req: any) {
    if (!year) {
      throw new Error('请选择学年');
    }
    return this.yearSummaryService.listByYear(req.user.userId, year);
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  adminList() {
    return this.yearSummaryService.listAllForAdmin();
  }

  @Post()
  create(
    @Body() body: {
      academicYear: string;
      title: string;
      fileUrl: string;
      fileName: string;
      fileSize?: number;
    },
    @Req() req: any,
  ) {
    return this.yearSummaryService.create(req.user.userId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; fileUrl?: string; fileName?: string; fileSize?: number },
    @Req() req: any,
  ) {
    return this.yearSummaryService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.yearSummaryService.remove(req.user.userId, id);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.yearSummaryService.getById(req.user.userId, id);
  }
}
