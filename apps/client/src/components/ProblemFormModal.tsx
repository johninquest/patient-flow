import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FormInput, FormSelect, Modal } from './ui';
import type { SelectGroup } from './ui';
import { useDiagnoses } from '../lib/api/diagnoses';
import {
  PROBLEM_STATUSES,
  type Problem,
  type ProblemStatus,
} from '../lib/types/clinical.types';

/**
 * Create/update payload for a problem.
 *
 * Only explicitly-provided fields are included: the API schemas are `.strict()`,
 * so an explicit `undefined` key would be rejected rather than ignored.
 */
export interface ProblemPayload {
  patient_id?: string;
  encounter_id?: string;
  description?: string;
  code?: string;
  code_system?: string;
  diagnosis_slug?: string;
  status?: ProblemStatus;
  onset_date?: string;
  resolved_date?: string;
  notes?: string;
}

interface ProblemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProblemPayload) => void;
  patientId: string;
  /** The encounter the problem is being recorded from, when there is one. */
  encounterId?: string;
  isLoading: boolean;
  title: string;
  initialData?: Problem;
}

/**
 * Create/edit form for a problem-list entry.
 *
 * The diagnosis dropdown is the point of this form: picking a catalogue entry
 * fills `description`, `code`, `code_system` and `diagnosis_slug` together, so a
 * coded diagnosis is never half-populated. `description` stays editable
 * afterwards, which is what allows an off-list diagnosis — clearing it clears
 * the code with it, since a code that does not match its description is worse
 * than no code at all.
 */
export function ProblemFormModal({
  isOpen,
  onClose,
  onSubmit,
  patientId,
  encounterId,
  isLoading,
  title,
  initialData,
}: ProblemFormModalProps) {
  const { t } = useTranslation();
  const { data: catalogue } = useDiagnoses();

  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    code: initialData?.code || '',
    code_system: initialData?.code_system || '',
    diagnosis_slug: initialData?.diagnosis_slug || '',
    status: initialData?.status || ('active' as ProblemStatus),
    onset_date: initialData?.onset_date
      ? initialData.onset_date.slice(0, 10)
      : '',
    resolved_date: initialData?.resolved_date
      ? initialData.resolved_date.slice(0, 10)
      : '',
    notes: initialData?.notes || '',
  });

  /**
   * Grouped options for the picker.
   *
   * Group headings are UI chrome and therefore translated. The diagnosis names
   * themselves are rendered verbatim from the API — an explicit i18n exception,
   * see ADR 0021.
   *
   * Empty groups are dropped: the catalogue declares an `other` group that
   * currently has no entries, and an empty `<optgroup>` renders as a stray
   * heading with nothing under it.
   */
  const diagnosisGroups: SelectGroup[] = (catalogue?.groups ?? [])
    .map((group) => ({
      label: t(`diagnoses.groups.${group}`),
      options: (catalogue?.items ?? [])
        .filter((item) => item.group === group)
        .map((item) => ({
          value: item.slug,
          label: `${item.name} (${item.code})`,
        })),
    }))
    .filter((group) => group.options.length > 0);

  /** Fill the coding triple from a catalogue pick. */
  const handleDiagnosisPick = (slug: string) => {
    if (!slug) {
      // Deselecting clears the code, leaving whatever description is typed as
      // free text.
      setFormData((prev) => ({
        ...prev,
        code: '',
        code_system: '',
        diagnosis_slug: '',
      }));
      return;
    }

    const item = catalogue?.items.find((entry) => entry.slug === slug);
    if (!item) return;

    setFormData((prev) => ({
      ...prev,
      description: item.name,
      code: item.code,
      code_system: 'ICD-10',
      diagnosis_slug: item.slug,
    }));
  };

  /**
   * Editing the description by hand detaches the code.
   *
   * The API requires `diagnosis_slug` to agree with `code`, so keeping a code
   * while the description says something else would either be rejected or store
   * a mismatch. Detaching is the honest option.
   */
  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => {
      const stillMatches = prev.code_system === 'ICD-10' && value.length > 0;
      if (!stillMatches) {
        return { ...prev, description: value, code: '', code_system: '', diagnosis_slug: '' };
      }
      return { ...prev, description: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ProblemPayload = {
      description: formData.description.trim(),
      status: formData.status,
    };

    // Create-only fields: the update schema rejects both, since re-pointing a
    // problem at another patient or visit would rewrite clinical history.
    if (!initialData) {
      payload.patient_id = patientId;
      if (encounterId) {
        payload.encounter_id = encounterId;
      }
    }

    if (formData.code) {
      payload.code = formData.code;
      payload.code_system = formData.code_system;
      payload.diagnosis_slug = formData.diagnosis_slug;
    }
    if (formData.onset_date) {
      payload.onset_date = formData.onset_date;
    }
    if (formData.resolved_date) {
      payload.resolved_date = formData.resolved_date;
    }
    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }

    onSubmit(payload);
  };

  const textareaClass =
    'w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label={t('problems.fields.diagnosis')}
          value={formData.diagnosis_slug}
          onChange={(e) => handleDiagnosisPick(e.target.value)}
          placeholder={t('problems.fields.diagnosisPlaceholder')}
          groups={diagnosisGroups}
          helpText={t('problems.fields.diagnosisHelp')}
        />

        <div>
          <label
            htmlFor="problem-description"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {t('problems.fields.description')}
          </label>
          <textarea
            id="problem-description"
            rows={2}
            required
            maxLength={500}
            value={formData.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className={textareaClass}
          />
          {formData.code && (
            <p className="mt-1.5 text-sm text-text-secondary">
              {t('problems.fields.codedAs', {
                code: formData.code,
                system: formData.code_system,
              })}
            </p>
          )}
        </div>

        <FormSelect
          label={t('problems.fields.status')}
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as ProblemStatus })
          }
          options={PROBLEM_STATUSES.map((status) => ({
            value: status,
            label: t(`problems.statuses.${status}`),
          }))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label={t('problems.fields.onsetDate')}
            type="date"
            value={formData.onset_date}
            onChange={(e) => setFormData({ ...formData, onset_date: e.target.value })}
          />
          <FormInput
            label={t('problems.fields.resolvedDate')}
            type="date"
            value={formData.resolved_date}
            onChange={(e) =>
              setFormData({ ...formData, resolved_date: e.target.value })
            }
          />
        </div>

        <div>
          <label
            htmlFor="problem-notes"
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {t('problems.fields.notes')}
          </label>
          <textarea
            id="problem-notes"
            rows={3}
            maxLength={5000}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={textareaClass}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !formData.description.trim()}
          >
            {isLoading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
