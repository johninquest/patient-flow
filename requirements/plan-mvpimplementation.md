# Plan: Implement MVP for Property Rent Collection App

Implement Phase 1 MVP: PocketBase collections, Property CRUD, Unit CRUD, Tenant CRUD, Rent entry, Expense tracking, and Dashboard — following existing codebase patterns with Svelte 5 + Tailwind.

## Steps

1. **Create PocketBase collections via Admin UI** (`http://localhost:8080/_/`)
   - `properties`: name, city, country, construction_year, owner (relation→users)
   - `units`: unit_name, unit_number, property (relation→properties)
   - `tenants`: first_name, last_name, preferred_name, id_card_number, phone, property (relation→properties), unit (relation→units, optional), active
   - `rent_entries`: tenant (relation→tenants), amount, payment_date, rent_month, notes, recorded_by (relation→users)
   - `expenses`: property (relation→properties), unit (relation→units, optional), category, description, amount, expense_date, vendor, recorded_by (relation→users)
   - Configure row-level security rules filtering by `owner = @request.auth.id`

2. **Create TypeScript type definitions** in `frontend/src/lib/types/`
   - `property.types.ts`, `unit.types.ts`, `tenant.types.ts`, `rent.types.ts`, `expense.types.ts` extending `RecordModel`
   - `currency.types.ts` with country→currency mapping

3. **Create service layer** in `frontend/src/lib/services/`
   - `property.service.ts`, `unit.service.ts`, `tenant.service.ts`, `rent.service.ts`, `expense.service.ts` with CRUD methods
   - Follow existing `auth.service.ts` pattern

4. **Create missing UI components** in `frontend/src/lib/components/`
   - `Table.svelte` (for listings), `Modal.svelte` (forms/confirmations), `EmptyState.svelte`, `Select.svelte`
   - Follow existing component patterns using `$props()`, `$state()`, Tailwind styling

5. **Create route structure** under `frontend/src/routes/`
   - `properties/+page.svelte` (list), `properties/new/+page.svelte` (create)
   - `properties/[id]/+page.svelte` (detail with units, tenants & expenses), `properties/[id]/edit/+page.svelte`
   - Unit management within property detail (add/edit/remove units)
   - Rent entry form: property → select tenant → record payment
   - Expense entry form: property → (optional) select unit → record expense

6. **Update dashboard** (`frontend/src/routes/dashboard/+page.svelte`)
   - Replace placeholder with property list overview
   - Quick-add rent button
   - Quick-add expense button
   - Summary cards: Total rent collected, Total expenses, Net income

## Further Considerations

1. **Collection creation**: Manual via Admin UI now, or create a migration script in `pb_hooks.js` for reproducibility?
2. **Rent period format**: Use "YYYY-MM" string, or separate year/month fields for easier filtering?
3. **Expense categories**: Predefined list or allow custom? Recommend: predefined + "other"
4. **Country list**: Predefined select field for currency mapping consistency
