import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry = '15m';  // 15 minutes
  private readonly refreshTokenExpiry = '7d';  // 7 days

  constructor(private prisma: PrismaService) {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  }

  async validateUser(email: string, password: string) {
    const normalizedEmail = (email ?? '').toString().trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (user.organization.status !== 'active') {
      throw new UnauthorizedException('Organização suspensa');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }

  // Generate access and refresh tokens
  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token hash in database (optional for token revocation)
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { 
        lastLogin: new Date(),
        // Store refresh token hash for validation
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private generateAccessToken(user: any): string {
    const payload: TokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      type: 'access',
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.accessTokenExpiry });
  }

  private generateRefreshToken(user: any): string {
    const payload: TokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      type: 'refresh',
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiry });
  }

  // Refresh access token using refresh token
  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, this.jwtSecret) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { organization: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      const newAccessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      return {
        accessToken: newAccessToken,
        expiresIn: 900,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  // Verify access token
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Token inválido');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expirado');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }

  // Request password reset
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'Se o email existir, você receberá um link de recuperação' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    // In production, send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    console.log('📧 Reset password URL:', resetUrl);

    // TODO: Send email with reset link using NotificationsService

    return { 
      message: 'Se o email existir, você receberá um link de recuperação',
      // Only in development:
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    };
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string) {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    // Validate password strength
    if (newPassword.length < 6) {
      throw new BadRequestException('A senha deve ter pelo menos 6 caracteres');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  // Change password (authenticated user)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async getSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }
}
