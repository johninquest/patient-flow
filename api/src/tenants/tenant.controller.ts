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
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  findByProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: any) {
    return this.tenantService.findByProperty(propertyId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenantService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createDto: CreateTenantDto, @CurrentUser() user: any) {
    return this.tenantService.create(createDto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenantService.remove(id, user.id);
  }
}