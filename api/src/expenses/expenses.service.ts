import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../db';
import { expenses, properties, user_access } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  async findByProperty(propertyId: string, userId: string) {
    // Check if user has access to the property
    const canAccess = await this.checkPropertyAccess(propertyId, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db
      .select()
      .from(expenses)
      .where(eq(expenses.property, propertyId))
      .orderBy(expenses.expense_date);
  }

  async findOne(id: string, userId: string) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Check if user has access to the property
    const canAccess = await this.checkPropertyAccess(expense.property, userId);
    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return expense;
  }

  async create(data: CreateExpenseDto, userId: string) {
    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(data.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        property: data.property,
        unit: data.unit,
        category: data.category,
        description: data.description,
        amount: data.amount.toString(),
        expense_date: new Date(data.expense_date),
        vendor: data.vendor,
        recorded_by: userId,
      })
      .returning();

    return expense;
  }

  async update(id: string, data: UpdateExpenseDto, userId: string) {
    // Get expense first
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(expense.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {};
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.category) updateData.category = data.category;
    if (data.description) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.expense_date) updateData.expense_date = new Date(data.expense_date);
    if (data.vendor !== undefined) updateData.vendor = data.vendor;

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    // Get expense first
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Check if user has edit access to the property
    const canEdit = await this.checkPropertyEditAccess(expense.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    await db.delete(expenses).where(eq(expenses.id, id));
    return { success: true };
  }

  private async checkPropertyAccess(
    propertyId: string,
    userId: string,
  ): Promise<boolean> {
    // Check if user owns the property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    if (property) return true;

    // Check if user has access via user_access
    const [access] = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.property, propertyId),
          eq(user_access.user, userId),
        ),
      )
      .limit(1);

    return !!access;
  }

  private async checkPropertyEditAccess(
    propertyId: string,
    userId: string,
  ): Promise<boolean> {
    // Check if user owns the property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.owner, userId)))
      .limit(1);

    if (property) return true;

    // Check if user has manager access via user_access
    const [access] = await db
      .select()
      .from(user_access)
      .where(
        and(
          eq(user_access.property, propertyId),
          eq(user_access.user, userId),
          eq(user_access.role, 'manager'),
        ),
      )
      .limit(1);

    return !!access;
  }
}