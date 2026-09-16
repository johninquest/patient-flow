import {
  AbilityBuilder,
  MongoAbility,
  createMongoAbility,
} from '@casl/ability';
import { Role } from './roles.js';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subjects = 'Patient' | 'Encounter' | 'Task' | 'User' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface User {
  id: string;
  role: string;
}

/**
 * Define abilities for a user based on their role.
 * This is the single source of truth for authorization rules.
 */
export function defineAbilitiesFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  switch (user.role as Role) {
    case 'admin':
      // Admins have full access
      can('manage', 'all');
      break;

    case 'provider':
      // Providers can read all patients
      can('read', 'Patient');
      // Providers can update patient medical fields only (enforced in service)
      can('update', 'Patient');
      // Providers cannot delete patients
      cannot('delete', 'Patient');

      // Providers can create encounters
      can('create', 'Encounter');
      // Providers can read all encounters
      can('read', 'Encounter');
      // Providers can update encounters they own (enforced in service with ownership check)
      can('update', 'Encounter');
      // Providers cannot delete encounters
      cannot('delete', 'Encounter');

      // Providers can manage tasks
      can('create', 'Task');
      can('read', 'Task');
      can('update', 'Task');
      can('delete', 'Task');

      // Providers cannot manage users
      cannot('manage', 'User');
      break;

    case 'clinical_staff':
      // Clinical staff can read all patients
      can('read', 'Patient');
      // Clinical staff can create patients
      can('create', 'Patient');
      // Clinical staff can update patient contact/medical fields (enforced in service)
      can('update', 'Patient');
      // Clinical staff cannot delete patients
      cannot('delete', 'Patient');

      // Clinical staff can manage encounters
      can('create', 'Encounter');
      can('read', 'Encounter');
      can('update', 'Encounter');
      cannot('delete', 'Encounter');

      // Clinical staff can manage tasks
      can('create', 'Task');
      can('read', 'Task');
      can('update', 'Task');
      can('delete', 'Task');

      // Clinical staff cannot manage users
      cannot('manage', 'User');
      break;

    case 'front_desk':
      // Front desk can read all patients
      can('read', 'Patient');
      // Front desk cannot create patients (ADR 0002)
      cannot('create', 'Patient');
      // Front desk can update patient demographics (enforced in service)
      can('update', 'Patient');
      // Front desk cannot delete patients
      cannot('delete', 'Patient');

      // Front desk can manage encounters
      can('create', 'Encounter');
      can('read', 'Encounter');
      can('update', 'Encounter');
      cannot('delete', 'Encounter');

      // Front desk can manage tasks
      can('create', 'Task');
      can('read', 'Task');
      can('update', 'Task');
      can('delete', 'Task');

      // Front desk cannot manage users
      cannot('manage', 'User');
      break;

    case 'pending':
      // Self-registered, awaiting an admin to grant a role. Authenticated but
      // deliberately grants nothing. AuthGuard rejects these users before any
      // route runs, so this branch is defence in depth rather than the primary
      // gate.
      break;

    default:
      // Unknown role - no permissions
      break;
  }

  return build();
}
