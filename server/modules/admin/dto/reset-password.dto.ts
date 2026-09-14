import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于8位' })
  @MaxLength(128, { message: '密码长度不能超过128位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大小写字母和数字',
  })
  newPassword: string;
}
