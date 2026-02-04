import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
