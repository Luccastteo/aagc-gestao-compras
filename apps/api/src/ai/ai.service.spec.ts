import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { of } from 'rxjs';

describe('AIService', () => {
  let service: AIService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should call OpenAI API and return response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Test response' },
          }],
          model: 'gpt-test',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse) as any);

      const result = await service.chat([
        { role: 'user', content: 'Test message' },
      ]);

      expect(result.content).toBe('Test response');
      expect(result.tokens).toBe(30);
      expect(result.model).toBe('gpt-test');
    });
  });
});
