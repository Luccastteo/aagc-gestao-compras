import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
    config: CircuitConfig;
  }> = new Map();

  private readonly defaultConfig: CircuitConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 60 segundos
    resetTimeout: 30000, // 30 segundos
  };

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    config: Partial<CircuitConfig> = {},
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttempt: Date.now(),
        config: fullConfig,
      });
    }

    const circuit = this.circuits.get(key)!;

    // Se circuito está aberto
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        this.logger.warn(`Circuit breaker OPEN for ${key}`);
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      }
      // Tenta half-open
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      this.logger.log(`Circuit breaker ${key} entering HALF_OPEN state`);
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker timeout')), fullConfig.timeout),
        ),
      ]);

      // Sucesso
      this.onSuccess(key);
      return result;
    } catch (error) {
      // Falha
      this.onFailure(key);
      throw error;
    }
  }

  private onSuccess(key: string): void {
    const circuit = this.circuits.get(key)!;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
        this.logger.log(`Circuit breaker ${key} CLOSED`);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  private onFailure(key: string): void {
    const circuit = this.circuits.get(key)!;
    circuit.failures++;

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.config.resetTimeout;
      this.logger.error(`Circuit breaker ${key} OPENED after ${circuit.failures} failures`);
    }
  }

  getState(key: string): CircuitState {
    return this.circuits.get(key)?.state || CircuitState.CLOSED;
  }

  reset(key: string): void {
    this.circuits.delete(key);
    this.logger.log(`Circuit breaker ${key} reset`);
  }
}
