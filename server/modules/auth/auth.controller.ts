import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthResponse, UserInfo } from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(): Promise<never> {
    throw new ForbiddenException('系统已关闭自助注册，如需开通账号请联系管理员');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('sessionId') sessionId: string): Promise<{ message: string }> {
    await this.authService.logout(sessionId);
    return { message: '退出登录成功' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('userId') userId: string): Promise<UserInfo> {
    return this.authService.getCurrentUser(userId);
  }

  @Get('heartbeat')
  @UseGuards(JwtAuthGuard)
  async heartbeat(@CurrentUser('sessionId') sessionId: string): Promise<{ message: string }> {
    await this.authService.heartbeat(sessionId);
    return { message: 'ok' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }
}
