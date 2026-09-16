import { Module } from '@nestjs/common';
import { YearSummaryController } from './year-summary.controller';
import { YearSummaryService } from './year-summary.service';

@Module({
  controllers: [YearSummaryController],
  providers: [YearSummaryService],
  exports: [YearSummaryService],
})
export class YearSummaryModule {}
