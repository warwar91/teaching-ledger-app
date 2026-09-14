import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(128, { message: '密码长度不能超过128位' })
  password: string;
}
