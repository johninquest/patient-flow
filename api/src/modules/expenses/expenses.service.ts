import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../db';
import { expenses, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { canAccessProperty, canEditProperty } from '../common/access.util';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly activityService: ActivityService) {}

  async create(data: CreateExpenseDto, userId: string) {
    const canEdit = await canEditProperty(data.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const [expense] = await db
      .insert(expenses)
      .values({
        property: data.property,
        unit: data.unit || null,
        category: data.category,
        description: data.description,
        amount: data.amount.toString(),
        expense_date: new Date(data.expense_date),
        vendor: data.vendor || null,
        recorded_by: userId,
      })
      .returning();

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'create',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: data.property,
    });

    return expense;
  }

  async findAll(propertyId: string, userId: string) {
    const hasAccess = await canAccessProperty(propertyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return db.select().from(expenses).where(eq(expenses.property, propertyId));
  }

  async findByProperty(propertyId: string, userId: string) {
    return this.findAll(propertyId, userId);
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

    const hasAccess = await canAccessProperty(expense.property, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return expense;
  }

  async update(id: string, data: UpdateExpenseDto, userId: string) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const canEdit = await canEditProperty(expense.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Calculate changes
    const changes = this.activityService.calculateChanges(
      expense,
      data,
      ['amount', 'category', 'description', 'expense_date', 'vendor'],
    );

    const [updated] = await db
      .update(expenses)
      .set({
        ...data,
        amount: data.amount?.toString(),
        expense_date: data.expense_date ? new Date(data.expense_date) : undefined,
        updated: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    // Create activity log only if there were significant changes
    if (changes) {
      await this.activityService.createLog({
        entity_type: 'expense',
        entity_id: id,
        action: 'update',
        changes,
        user_id: userId,
        user_name: currentUser?.name || undefined,
        user_email: currentUser?.email || undefined,
        property_id: expense.property,
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const canEdit = await canEditProperty(expense.property, userId);
    if (!canEdit) {
      throw new ForbiddenException('Access denied');
    }

    // Get user info
    const [currentUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    await db.delete(expenses).where(eq(expenses.id, id));

    // Create activity log
    await this.activityService.createLog({
      entity_type: 'expense',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      user_name: currentUser?.name || undefined,
      user_email: currentUser?.email || undefined,
      property_id: expense.property,
    });

    return { success: true };
  }
}