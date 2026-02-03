import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('test')
  test() {
    return { message: 'Auth controller is working!' };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      console.log('🔐 Login attempt:', body);
      
      if (!body.email || !body.password) {
        return { error: 'Email and password required' };
      }

      const user = await this.authService.validateUser(body.email, body.password);
      
      console.log('✅ User validated:', user.email);

      return {
        user,
        token: `session_${user.userId}_${Date.now()}`,
      };
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return {
        error: error.message || 'Login failed',
        details: error.stack,
      };
    }
  }
}
