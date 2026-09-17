import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { db } from '../../core/db/index.js';
import {
  clinical_notes,
  clinical_note_revisions,
  encounters,
  patients,
  user,
} from '../../core/db/schema.js';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto.js';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto.js';
import { AuditService } from '../audit/audit.service.js';
import {
  clinicalNoteAuditScope,
  deletedSnapshot,
} from '../audit/audit-scope.js';
import type { AppAbility } from '../../core/auth/ability.js';
import { translateDatabaseError } from '../../core/common/utils/database-error.util.js';

/**
 * The SOAP content fields. Nothing in this list may ever be written to
 * `audit_log` — see `AUDIT_SNAPSHOT_FIELDS` below.
 *
 * Exported so `clinical-notes.service.spec.ts` can assert the two lists stay
 * disjoint. That invariant is the whole reason the encounter activity timeline
 * can remain readable by every role.
 */
export const SOAP_CONTENT_FIELDS = [
  'subjective',
  'objective',
  'assessment',
  'plan',
  'additional_notes',
] as const;

/**
 * Fields snapshotted on create and delete, and the only fields a `clinical_note`
 * audit diff may contain. **Deliberately excludes every content field.**
 *
 * `GET /api/audit/encounter/:id` is readable by all authenticated roles, so note
 * text in a diff would be a PHI leak to `front_desk`. The content trail is
 * `GET /api/clinical-notes/:id/revisions`, which is role-restricted. See the
 * audit section of docs/contracts/schema.md.
 */
export const AUDIT_SNAPSHOT_FIELDS = ['note_type', 'version'] as const;

/** Shared projection for note reads. */
const noteSelect = {
  id: clinical_notes.id,
  patient_id: clinical_notes.patient_id,
  encounter_id: clinical_notes.encounter_id,
  patient_name: sql<string>`${patients.first_name} || ' ' || ${patients.last_name}`,
  note_type: clinical_notes.note_type,
  subjective: clinical_notes.subjective,
  objective: clinical_notes.objective,
  assessment: clinical_notes.assessment,
  plan: clinical_notes.plan,
  additional_notes: clinical_notes.additional_notes,
  author_user_id: clinical_notes.author_user_id,
  author_name: clinical_notes.author_name,
  author_role: clinical_notes.author_role,
  version: clinical_notes.version,
  created_at: clinical_notes.created_at,
  updated_at: clinical_notes.updated_at,
};

export interface FindClinicalNotesFilters {
  patientId?: string;
  encounterId?: string;
}

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly auditService: AuditService) {}

  async create(
    dto: CreateClinicalNoteDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('create', 'ClinicalNote')) {
      throw new ForbiddenException(
        'You are not allowed to create clinical notes',
      );
    }

    // The encounter is the source of truth for the patient link. Taking
    // `patient_id` from the request would allow a note to be filed against a
    // patient it does not belong to.
    const [encounter] = await db
      .select({ id: encounters.id, patient_id: encounters.patient_id })
      .from(encounters)
      .where(eq(encounters.id, dto.encounter_id))
      .limit(1);

    if (!encounter) {
      throw new NotFoundException(
        `Encounter with ID ${dto.encounter_id} not found`,
      );
    }

    const authorName = await this.resolveUserName(userId);

    let note;
    try {
      [note] = await db
        .insert(clinical_notes)
        .values({
          patient_id: encounter.patient_id,
          encounter_id: encounter.id,
          note_type: dto.note_type || 'consultation',
          subjective: dto.subjective || null,
          objective: dto.objective || null,
          assessment: dto.assessment || null,
          plan: dto.plan || null,
          additional_notes: dto.additional_notes || null,
          author_user_id: userId,
          author_name: authorName,
          author_role: userRole,
        })
        .returning();
    } catch (error) {
      throw translateDatabaseError(error);
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'clinical_note.created',
      ...clinicalNoteAuditScope(note),
      // Metadata only — see AUDIT_SNAPSHOT_FIELDS.
      diff: {
        note_type: { from: null, to: note.note_type },
        version: { from: null, to: note.version },
      },
    });

    return this.findOne(note.id);
  }

  async findAll(filters: FindClinicalNotesFilters = {}) {
    const conditions: SQL[] = [];

    if (filters.patientId) {
      conditions.push(eq(clinical_notes.patient_id, filters.patientId));
    }
    if (filters.encounterId) {
      conditions.push(eq(clinical_notes.encounter_id, filters.encounterId));
    }

    return (
      db
        .select(noteSelect)
        .from(clinical_notes)
        .leftJoin(patients, eq(clinical_notes.patient_id, patients.id))
        .where(and(...conditions))
        // Newest first: a clinician reads the most recent documentation first.
        .orderBy(desc(clinical_notes.created_at))
    );
  }

  async findOne(id: string) {
    const [note] = await db
      .select(noteSelect)
      .from(clinical_notes)
      .leftJoin(patients, eq(clinical_notes.patient_id, patients.id))
      .where(eq(clinical_notes.id, id))
      .limit(1);

    if (!note) {
      throw new NotFoundException(`Clinical note with ID ${id} not found`);
    }

    return note;
  }

  /**
   * Edit a note, preserving what it previously said.
   *
   * Three things happen together, so they run in a transaction:
   *   1. the current head is copied into `clinical_note_revisions`
   *      (`revision_number` = the head's version before the edit),
   *   2. the head is overwritten with the new content,
   *   3. `version` is incremented.
   *
   * If step 2's optimistic-lock predicate matches no row, another session edited
   * the note first and the whole transaction rolls back — a clinical record must
   * not be silently overwritten by a stale form.
   */
  async update(
    id: string,
    dto: UpdateClinicalNoteDto,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('update', 'ClinicalNote')) {
      throw new ForbiddenException(
        'You are not allowed to update clinical notes',
      );
    }

    const existing = await this.findOne(id);

    // Author-or-admin. A colleague who disagrees writes their own note rather
    // than editing someone else's — the revision table preserves history, but
    // attribution is the stronger guarantee.
    const isAuthor = existing.author_user_id === userId;
    if (!isAuthor && userRole !== 'admin') {
      throw new ForbiddenException(
        'Only the note author or an admin can edit this note',
      );
    }

    // Content is intentionally absent from this diff. See AUDIT_SNAPSHOT_FIELDS.
    const nextContent = {
      note_type: dto.note_type ?? existing.note_type,
      subjective: dto.subjective ?? existing.subjective,
      objective: dto.objective ?? existing.objective,
      assessment: dto.assessment ?? existing.assessment,
      plan: dto.plan ?? existing.plan,
      additional_notes: dto.additional_notes ?? existing.additional_notes,
    };

    const editorName = await this.resolveUserName(userId);

    let updated;
    try {
      updated = await db.transaction(async (tx) => {
        // 1. Preserve the content being replaced.
        await tx.insert(clinical_note_revisions).values({
          note_id: existing.id,
          revision_number: existing.version,
          note_type: existing.note_type,
          subjective: existing.subjective,
          objective: existing.objective,
          assessment: existing.assessment,
          plan: existing.plan,
          additional_notes: existing.additional_notes,
          edited_by: userId,
          edited_by_name: editorName,
        });

        // 2. Overwrite the head, guarded by the optimistic lock.
        const rows = await tx
          .update(clinical_notes)
          .set({
            ...nextContent,
            version: existing.version + 1,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(clinical_notes.id, id),
              eq(clinical_notes.version, dto.version),
            ),
          )
          .returning();

        if (rows.length === 0) {
          // Rolls the revision insert back too, so no orphan history is left.
          throw new ConflictException(
            'This note was changed by someone else. Reload it and reapply your edit.',
          );
        }

        return rows[0];
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw translateDatabaseError(error);
    }

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'clinical_note.updated',
      ...clinicalNoteAuditScope(updated),
      // The version bump only. Recording *which* fields changed would leak
      // whether e.g. the assessment was rewritten, and recording their values
      // would leak the content outright.
      diff: {
        version: { from: existing.version, to: updated.version },
      },
    });

    return this.findOne(id);
  }

  /**
   * The revision history, oldest first, so a reader can follow the note's
   * evolution from the original content forward.
   */
  async findRevisions(id: string) {
    // Confirms the note exists, so a bad id is a 404 rather than an empty list.
    await this.findOne(id);

    return db
      .select()
      .from(clinical_note_revisions)
      .where(eq(clinical_note_revisions.note_id, id))
      .orderBy(clinical_note_revisions.revision_number);
  }

  async remove(
    id: string,
    userId: string,
    userRole: string,
    ability: AppAbility,
  ) {
    if (!ability.can('delete', 'ClinicalNote')) {
      throw new ForbiddenException(
        'You are not allowed to delete clinical notes',
      );
    }

    const existing = await this.findOne(id);

    await this.auditService.record({
      actor_user_id: userId,
      actor_role: userRole,
      action: 'clinical_note.deleted',
      ...clinicalNoteAuditScope(existing),
      // Metadata only. `deletedSnapshot` is used rather than inlining the shape
      // so create/delete stay symmetrical, but the field list excludes content.
      diff: deletedSnapshot(existing, [...AUDIT_SNAPSHOT_FIELDS]) ?? undefined,
    });

    // Revisions cascade with the note (FK `onDelete: 'cascade'`).
    await db.delete(clinical_notes).where(eq(clinical_notes.id, id));

    return { success: true };
  }

  /**
   * Resolve a display name for the attribution snapshot.
   *
   * Mirrors `AuditService.resolveActorName`. Kept local rather than exported
   * from AuditService because the audit service's copy is private to it, and
   * widening its surface for one caller would couple two unrelated modules.
   */
  private async resolveUserName(userId: string): Promise<string | null> {
    try {
      const [actor] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      return actor?.name || actor?.email || null;
    } catch {
      return null;
    }
  }
}
