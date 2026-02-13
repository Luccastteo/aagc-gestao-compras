import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('test')
  test() {
    return { message: 'Auth controller is working!' };
  }

  // Login with JWT tokens
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const email = (loginDto?.email ?? '').toString().trim().toLowerCase();
    const password = (loginDto?.password ?? '').toString().trim();
    if (!email || !password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }
    try {
      const result = await this.authService.login(email, password);
      return {
        user: {
          userId: result.user.userId,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          organizationId: result.user.organizationId,
          organizationName: result.user.organizationName,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      };
    } catch (error: any) {
      const message = error?.message || 'Credenciais inválidas';
      throw new UnauthorizedException(
        message.includes('Credenciais') || message.includes('inválidas') ? message : 'Credenciais inválidas',
      );
    }
  }

  // Refresh access token
  @Public()
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // Verify token and get user info
  @Public()
  @Post('verify')
  async verifyToken(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.split(' ')[1];
    const payload = this.authService.verifyAccessToken(token);

    const user = await this.authService.getSession(payload.userId);
    return { valid: true, user };
  }

  // Request password reset
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // Reset password with token
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // Change password (authenticated)
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  // Get current session
  @Get('session')
  async getSession(@CurrentUser() user: CurrentUserData) {
    return this.authService.getSession(user.userId);
  }

  // Logout (optional - client should just delete tokens)
  @Post('logout')
  async logout(@CurrentUser() user: CurrentUserData) {
    // In a more advanced implementation, you would invalidate the refresh token
    console.log('👋 User logged out:', user.email);
    return { message: 'Logout realizado com sucesso' };
  }
}
