import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('status', () => {
    it('should return ok, timestampUtc, uptimeMs', () => {
      const status = appController.getStatus() as any;
      expect(status.ok).toBe(true);
      expect(status.message).toBe('ok');
      expect(typeof status.timestampUtc).toBe('string');
      expect(typeof status.uptimeMs).toBe('number');
      expect(status.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
