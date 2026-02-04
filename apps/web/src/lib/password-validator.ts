/**
 * Validador client-side de senha forte (deve espelhar a lógica do backend).
 * 
 * Requisitos:
 * - Mínimo 10 caracteres
 * - Pelo menos 1 maiúscula
 * - Pelo menos 1 minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 símbolo
 * - Não pode ser senha comum
 */

const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567',
  'dragon', '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890', 'sunshine', 'master',
  'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael', 'ninja', 'mustang', 'password1',
  '000000', 'admin', 'letmein', 'monkey', 'princess', '1q2w3e4r', 'abc123', 'superman', 'qwertyuiop',
  'test', 'demo', 'demo123', 'root', 'toor', 'changeme', 'passw0rd', 'password123', 'admin123',
  'welcome123', 'qwerty123', 'senha', 'senha123', '12341234', 'asdf', 'asdfgh', 'zxcvbn',
]);

export interface PasswordStrength {
  isValid: boolean;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    notCommon: boolean;
  };
}

export function validatePasswordStrength(password: string, minLength = 10): PasswordStrength {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      checks: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSymbol: false,
        notCommon: false,
      },
    };
  }

  const checks = {
    minLength: password.length >= minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
  };

  const isValid = Object.values(checks).every(Boolean);

  return { isValid, checks };
}
