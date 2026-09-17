import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FormSelect, Modal } from './ui';
import { NOTE_TYPES, type ClinicalNote, type NoteType } from '../lib/types/clinical.types';

/**
 * Create/update payload for a clinical note.
 *
 * `version` is only sent on update — it is the optimistic lock, and the create
 * schema rejects it as an unknown key.
 */
export interface ClinicalNotePayload {
  encounter_id?: string;
  note_type?: NoteType;
  version?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  additional_notes?: string;
}

interface ClinicalNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClinicalNotePayload) => void;
  /** The encounter the note documents. Implied when opened from an encounter. */
  encounterId: string;
  isLoading: boolean;
  title: string;
  initialData?: ClinicalNote;
}

/**
 * Create/edit form for a SOAP clinical note.
 *
 * The four SOAP fields are separate inputs rather than one free-text body, which
 * is what gives `assessment` (the diagnosis narrative) and `plan` (the treatment
 * plan) a defined home instead of burying them in a paragraph.
 *
 * `additional_notes` is the escape hatch for anything that does not fit SOAP.
 */
export function ClinicalNoteFormModal({
  isOpen,
  onClose,
  onSubmit,
  encounterId,
  isLoading,
  title,
  initialData,
}: ClinicalNoteFormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    note_type: initialData?.note_type || ('consultation' as NoteType),
    subjective: initialData?.subjective || '',
    objective: initialData?.objective || '',
    assessment: initialData?.assessment || '',
    plan: initialData?.plan || '',
    additional_notes: initialData?.additional_notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ClinicalNotePayload = { note_type: formData.note_type };

    if (initialData) {
      // Required by the update schema — a stale form must not silently
      // overwrite an edit made in another session.
      payload.version = initialData.version;
    } else {
      payload.encounter_id = encounterId;
    }

    // Only send fields that have content, so clearing an input is distinguishable
    // from never having filled it. Empty strings are sent deliberately so a
    // clinician *can* blank a field they previously filled.
    const contentFields = [
      'subjective',
      'objective',
      'assessment',
      'plan',
      'additional_notes',
    ] as const;

    for (const field of contentFields) {
      const value = formData[field].trim();
      if (value || initialData) {
        payload[field] = value;
      }
    }

    onSubmit(payload);
  };

  /** SOAP section definitions, in the order a clinician reads them. */
  const soapSections = [
    { field: 'subjective' as const, rows: 4 },
    { field: 'objective' as const, rows: 4 },
    { field: 'assessment' as const, rows: 4 },
    { field: 'plan' as const, rows: 4 },
  ];

  const textareaClass =
    'w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';

  // A note must carry at least one SOAP field; an entirely empty note is noise
  // on the patient record.
  const hasContent = Object.values(formData).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label={t('clinicalNotes.fields.noteType')}
          value={formData.note_type}
          onChange={(e) =>
            setFormData({ ...formData, note_type: e.target.value as NoteType })
          }
          options={NOTE_TYPES.map((type) => ({
            value: type,
            label: t(`clinicalNotes.noteTypes.${type}`),
          }))}
        />

        {soapSections.map(({ field, rows }) => (
          <div key={field}>
            <label
              htmlFor={`note-${field}`}
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              {t(`clinicalNotes.soap.${field}`)}
            </label>
            <p className="text-xs text-text-secondary mb-1.5">
              {t(`clinicalNotes.soap.${field}Hint`)}
            </p>
            <textarea
              id={`note-${field}`}
              rows={rows}
              maxLength={10000}
              value={formData[field]}
              onChange={(e) =>
                setFormData({ ...formData, [field]: e.target.value })
              }
              className={textareaClass}
            />
          </div>
        ))}

        <div>
          <label
            htmlFor="note-additional_notes"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {t('clinicalNotes.soap.additional_notes')}
          </label>
          <textarea
            id="note-additional_notes"
            rows={3}
            maxLength={10000}
            value={formData.additional_notes}
            onChange={(e) =>
              setFormData({ ...formData, additional_notes: e.target.value })
            }
            className={textareaClass}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading || !hasContent}>
            {isLoading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
