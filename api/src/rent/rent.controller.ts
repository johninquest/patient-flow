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
import { RentService } from './rent.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('rent')
@UseGuards(AuthGuard)
export class RentController {
  constructor(private readonly rentService: RentService) {}

  @Get()
  findByProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: any) {
    if (propertyId) {
      return this.rentService.findByProperty(propertyId, user.id);
    }
    return [];
  }

  @Get('by-tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string, @CurrentUser() user: any) {
    return this.rentService.findByTenant(tenantId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rentService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createDto: CreateRentDto, @CurrentUser() user: any) {
    return this.rentService.create(createDto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRentDto,
    @CurrentUser() user: any,
  ) {
    return this.rentService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rentService.remove(id, user.id);
  }
}