import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { Card, StatusPill, Button, EmptyState, LoadingSpinner } from './ui';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import type { ClinicalNote, ClinicalNoteRevision } from '../lib/types/clinical.types';

interface ClinicalNoteListProps {
  notes: ClinicalNote[];
  /** Current user, to decide whether each note is editable by them. */
  currentUserId?: string;
  currentUserRole?: string;
  onEdit?: (note: ClinicalNote) => void;
}

/**
 * One note, with its revision history collapsed behind a toggle.
 *
 * History is only fetched when expanded, so a patient with many documented
 * visits does not trigger a revision request per note on page load.
 */
function ClinicalNoteCard({
  note,
  currentUserId,
  currentUserRole,
  onEdit,
}: {
  note: ClinicalNote;
  currentUserId?: string;
  currentUserRole?: string;
  onEdit?: (note: ClinicalNote) => void;
}) {
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);

  const { data: revisions, isLoading } = useQuery({
    queryKey: ['clinical-note-revisions', note.id],
    queryFn: () => api.get<ClinicalNoteRevision[]>(`/api/clinical-notes/${note.id}/revisions`),
    enabled: showHistory,
  });

  // Mirrors the API rule: the author or an admin may edit. A colleague who
  // disagrees writes their own note rather than editing someone else's.
  const canEdit =
    !!onEdit &&
    (note.author_user_id === currentUserId || currentUserRole === 'admin');

  const soapFields = [
    { key: 'subjective' as const, label: t('clinicalNotes.soap.subjective') },
    { key: 'objective' as const, label: t('clinicalNotes.soap.objective') },
    { key: 'assessment' as const, label: t('clinicalNotes.soap.assessment') },
    { key: 'plan' as const, label: t('clinicalNotes.soap.plan') },
    { key: 'additional_notes' as const, label: t('clinicalNotes.soap.additional_notes') },
  ];

  const hasRevisions = (revisions?.length ?? 0) > 0;

  return (
    <Card padding="none">
      <div className="px-4 py-4 sm:px-6 border-b border-border-default">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-text-primary">
                {t(`clinicalNotes.noteTypes.${note.note_type}`)}
              </h4>
              {note.version > 1 && (
                <StatusPill
                  status="waiting"
                  label={t('clinicalNotes.editedVersion', { version: note.version })}
                />
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {note.author_name || t('audit.unknownActor')}
              {' · '}
              {t(`staff.roles.${note.author_role}`, note.author_role)}
              {' · '}
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(note)}>
              <PencilSquareIcon className="w-4 h-4 mr-1.5" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <dl>
        {soapFields.map(({ key, label }, index) => {
          const value = note[key];
          if (!value) return null;
          return (
            <div
              key={key}
              className={`${index % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-surface'} px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
            >
              <dt className="text-sm font-medium text-text-secondary">{label}</dt>
              <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Revision history — the content trail for this note. */}
      <div className="px-4 py-3 sm:px-6 border-t border-border-default bg-bg-canvas">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
          aria-expanded={showHistory}
        >
          {showHistory ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          {t('clinicalNotes.history')}
          {note.version > 1 && ` (${note.version - 1})`}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3">
            {isLoading && <LoadingSpinner text={t('common.loading')} />}

            {!isLoading && !hasRevisions && (
              <p className="text-sm text-text-secondary">
                {t('clinicalNotes.noHistory')}
              </p>
            )}

            {revisions?.map((revision) => (
              <div
                key={revision.id}
                className="border border-border-default rounded-[var(--radius-card)] bg-bg-surface p-3"
              >
                <p className="text-xs text-text-secondary mb-2">
                  {t('clinicalNotes.revisionLabel', {
                    number: revision.revision_number,
                  })}
                  {' · '}
                  {revision.edited_by_name || t('audit.unknownActor')}
                  {' · '}
                  {new Date(revision.created_at).toLocaleString()}
                </p>
                <dl className="space-y-2">
                  {soapFields.map(({ key, label }) => {
                    const value = revision[key];
                    if (!value) return null;
                    return (
                      <div key={key}>
                        <dt className="text-xs font-medium text-text-secondary">
                          {label}
                        </dt>
                        <dd className="text-sm text-text-primary whitespace-pre-wrap">
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Read-only list of a patient's or encounter's clinical notes, newest first.
 *
 * Notes are never deleted from this view (deletion is admin-only and rare), so
 * there is no delete affordance here.
 */
export function ClinicalNoteList({
  notes,
  currentUserId,
  currentUserRole,
  onEdit,
}: ClinicalNoteListProps) {
  const { t } = useTranslation();

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
        title={t('clinicalNotes.empty.title')}
        description={t('clinicalNotes.empty.description')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <ClinicalNoteCard
          key={note.id}
          note={note}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
