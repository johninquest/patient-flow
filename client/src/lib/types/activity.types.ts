export type ActivityAction = 'create' | 'update' | 'delete';

export type ActivityEntityType = 
  | 'property' 
  | 'tenant' 
  | 'unit' 
  | 'rent_entry' 
  | 'expense' 
  | 'user_access';

export interface Activity {
  id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  action: ActivityAction;
  changes: Record<string, { from: any; to: any }> | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  property_id: string | null;
  created_at: string;
}

export interface ActivityFilters {
  user_id?: string;
  action?: ActivityAction;
  days?: number;
}