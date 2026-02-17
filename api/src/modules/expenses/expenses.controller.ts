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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('expenses')
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findByProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: any) {
    if (propertyId) {
      return this.expensesService.findByProperty(propertyId, user.id);
    }
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expensesService.findOne(id, user.id);
  }

  @Post()
  create(@Body() createDto: CreateExpenseDto, @CurrentUser() user: any) {
    return this.expensesService.create(createDto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expensesService.remove(id, user.id);
  }
}