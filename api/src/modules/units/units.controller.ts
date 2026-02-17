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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('units')
@UseGuards(AuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  findByProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: any) {
    return this.unitsService.findByProperty(propertyId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createDto: CreateUnitDto, @CurrentUser() user: any) {
    return this.unitsService.create(createDto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.unitsService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.remove(id, user.id);
  }
}