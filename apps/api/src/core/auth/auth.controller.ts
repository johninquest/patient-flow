import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from './auth';

@Controller('auth')
export class AuthController {
  private handler = toNodeHandler(getAuth());

  @All('*path') // Changed from '*' to '*path'
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Remove or comment out in production as per previous discussion
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Auth] ${req.method} ${req.originalUrl}`);
    }
    try {
      return await this.handler(req, res);
    } catch (error) {
      console.error('[Auth] Error:', error);
      res.status(500).json({ error: 'Internal auth error' });
    }
  }
}
