import { IsBoolean, IsNotEmpty } from 'class-validator';

export class DeleteUserDto {
  @IsBoolean()
  @IsNotEmpty({ message: '请确认删除操作' })
  confirm: boolean;
}
