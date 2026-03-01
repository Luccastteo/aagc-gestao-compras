import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador de senha forte.
 * 
 * Requisitos (configuráveis via ENV):
 * - Mínimo de caracteres (padrão: 10)
 * - Pelo menos 1 maiúscula
 * - Pelo menos 1 minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 símbolo (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Não pode ser senha comum (top 100 senhas mais usadas)
 * 
 * Uso:
 * ```ts
 * @IsStrongPassword()
 * password: string;
 * ```
 */

// Top 100 senhas mais comuns (básico - pode expandir para 10k se necessário)
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567',
  'dragon', '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890', 'sunshine', 'master',
  'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael', 'ninja', 'mustang', 'password1',
  '000000', 'admin', 'letmein', 'monkey', 'princess', '1q2w3e4r', 'abc123', 'superman', 'qwertyuiop',
  'test', 'demo', 'demo123', 'root', 'toor', 'changeme', 'passw0rd', 'password123', 'admin123',
  'welcome123', 'qwerty123', 'senha', 'senha123', '12341234', 'asdf', 'asdfgh', 'zxcvbn',
]);

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, _args?: ValidationArguments): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '10', 10);

    // Requisito 1: Tamanho mínimo
    if (password.length < minLength) {
      return false;
    }

    // Requisito 2: Pelo menos 1 maiúscula
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Requisito 3: Pelo menos 1 minúscula
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Requisito 4: Pelo menos 1 número
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Requisito 5: Pelo menos 1 símbolo
    if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      return false;
    }

    // Requisito 6: Não pode ser senha comum
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      return false;
    }

    return true;
  }

  defaultMessage(_args?: ValidationArguments): string {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '10', 10);
    return [
      `A senha deve ter no mínimo ${minLength} caracteres e incluir:`,
      '- Pelo menos 1 letra maiúscula',
      '- Pelo menos 1 letra minúscula',
      '- Pelo menos 1 número',
      '- Pelo menos 1 símbolo (!@#$%^&*)',
      '- Não pode ser uma senha comum',
    ].join(' ');
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
