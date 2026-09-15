import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  @Matches(/^(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/, {
    message: '用户名必须包含英文字母，可以是纯英文或英文+数字组合，不能纯数字',
  })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于8位' })
  @MaxLength(128, { message: '密码长度不能超过128位' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;
}
