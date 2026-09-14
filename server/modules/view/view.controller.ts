import { Controller, Get, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';

@Controller()
export class ViewController {
  @Get('*')
  serveIndex(@Req() req: Request, @Res() res: Response): void {
    // API 请求不经过此 fallback（由路由前缀保证）
    if (req.path.startsWith('/api')) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }
    const indexPath = join(process.cwd(), 'dist/client/index.html');
    res.sendFile(indexPath);
  }
}
