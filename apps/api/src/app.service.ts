import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startedAtMs = Date.now();

  getHello(): string {
    return 'Hello World!';
  }

  getStatus() {
    return {
      ok: true,
      message: 'ok',
      timestampUtc: new Date().toISOString(),
      uptimeMs: Date.now() - this.startedAtMs,
    };
  }
}
