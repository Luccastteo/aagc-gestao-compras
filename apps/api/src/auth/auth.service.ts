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
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry = '15m';  // 15 minutes
  private readonly refreshTokenExpiry = '7d';  // 7 days

  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'default-secret-change-in-production') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: JWT_SECRET env var must be set to a strong, unique secret in production');
      }
      console.warn('⚠️ JWT_SECRET not set. Using insecure default for development only.');
    }
    this.jwtSecret = secret || 'dev-only-insecure-secret-do-not-use-in-prod';
    this.refreshTokenSecret = this.jwtSecret + ':refresh';
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

    // Store refresh token hash for revocation support
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        lastLogin: new Date(),
        refreshTokenHash,
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

    return jwt.sign(payload, this.refreshTokenSecret, { expiresIn: this.refreshTokenExpiry });
  }

  // Refresh access token using refresh token
  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as TokenPayload;

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

      // Validate refresh token hasn't been revoked (e.g. by logout)
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      if (user.refreshTokenHash && user.refreshTokenHash !== tokenHash) {
        throw new UnauthorizedException('Refresh token revogado');
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

    // Build reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Only log reset URL in development (contains secret token)
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Reset password URL:', resetUrl);
    }

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

    // Validação de força feita no DTO (ResetPasswordDto usa @IsStrongPassword).
    // O service confia na validação já executada pelo ValidationPipe.
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

    // Validação de força feita no DTO (ChangePasswordDto usa @IsStrongPassword).
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  // Invalidate refresh token on logout
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
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
