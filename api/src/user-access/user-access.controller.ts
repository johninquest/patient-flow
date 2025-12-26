import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserAccessService } from './user-access.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('user-access')
@UseGuards(AuthGuard)
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  @Get()
  findByProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: any) {
    if (propertyId) {
      return this.userAccessService.findByProperty(propertyId, user.id);
    }
    return [];
  }

  @Get('my-access')
  getMyAccess(@CurrentUser() user: any) {
    return this.userAccessService.getMyAccess(user.id);
  }

  @Get('role/:propertyId')
  async getUserRole(@Param('propertyId') propertyId: string, @CurrentUser() user: any) {
    const role = await this.userAccessService.getUserRole(propertyId, user.id);
    return { role };
  }

  @Get('find-user')
  findUserByEmail(@Query('email') email: string) {
    return this.userAccessService.findUserByEmail(email);
  }

  @Post()
  grantAccess(
    @Body() data: { user: string; property: string; role: string },
    @CurrentUser() user: any,
  ) {
    return this.userAccessService.grantAccess(data, user.id);
  }

  @Put(':id')
  updateAccess(
    @Param('id') id: string,
    @Body() data: { role: string },
    @CurrentUser() user: any,
  ) {
    return this.userAccessService.updateAccess(id, data, user.id);
  }

  @Delete(':id')
  revokeAccess(@Param('id') id: string, @CurrentUser() user: any) {
    return this.userAccessService.revokeAccess(id, user.id);
  }
}

