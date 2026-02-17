import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Controller('properties')
@UseGuards(AuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.propertiesService.findAll(user.id);
  }

  @Get('owned')
  findOwned(@CurrentUser() user: any) {
    return this.propertiesService.findOwned(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertiesService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createDto: CreatePropertyDto, @CurrentUser() user: any) {
    return this.propertiesService.create(createDto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    return this.propertiesService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertiesService.remove(id, user.id);
  }
}