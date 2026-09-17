import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, StatusPill, Button, EmptyState } from './ui';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  problemStatusToDesignSystem,
  type Problem,
  type ProblemStatus,
} from '../lib/types/clinical.types';

interface ProblemListPanelProps {
  problems: Problem[];
  onAdd: () => void;
  onEdit: (problem: Problem) => void;
  onStatusChange: (problem: Problem, status: ProblemStatus) => void;
  /** Deletion is admin-only; the API enforces it, this hides the control. */
  onDelete?: (problem: Problem) => void;
  isLoading?: boolean;
}

/**
 * The patient's problem list — diagnoses that persist across visits.
 *
 * Distinct from clinical notes: a note records what happened in one visit,
 * whereas a problem is the durable clinical state. Active problems sort first
 * (the API orders them), because that is what a clinician scans for.
 */
export function ProblemListPanel({
  problems,
  onAdd,
  onEdit,
  onStatusChange,
  onDelete,
  isLoading,
}: ProblemListPanelProps) {
  const { t } = useTranslation();
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">
          {t('problems.title')}
        </h3>
        <Button size="sm" onClick={onAdd}>
          <PlusIcon className="w-4 h-4 mr-1.5" />
          {t('problems.add')}
        </Button>
      </div>

      {problems.length === 0 ? (
        <EmptyState
          icon={<PencilSquareIcon className="w-12 h-12" />}
          title={t('problems.empty.title')}
          description={t('problems.empty.description')}
        />
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {problems.map((problem) => (
              <li key={problem.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-text-primary">
                        {problem.description}
                      </p>
                      <StatusPill
                        status={problemStatusToDesignSystem(problem.status)}
                        label={t(`problems.statuses.${problem.status}`)}
                      />
                      {/* The code is shown as-is: an ICD-10 code is a clinical
                          identifier, not a translatable string. */}
                      {problem.code && (
                        <span className="text-xs text-text-secondary font-mono">
                          {problem.code_system} {problem.code}
                        </span>
                      )}
                    </div>

                    {(problem.onset_date || problem.resolved_date) && (
                      <p className="text-xs text-text-secondary">
                        {problem.onset_date && (
                          <>
                            {t('problems.fields.onsetDate')}:{' '}
                            {new Date(problem.onset_date).toLocaleDateString()}
                          </>
                        )}
                        {problem.onset_date && problem.resolved_date && ' · '}
                        {problem.resolved_date && (
                          <>
                            {t('problems.fields.resolvedDate')}:{' '}
                            {new Date(problem.resolved_date).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    )}

                    {problem.notes && (
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
                        {problem.notes}
                      </p>
                    )}

                    <p className="text-xs text-text-secondary mt-1">
                      {t('problems.recordedBy')}:{' '}
                      {problem.recorded_by_name || t('audit.unknownActor')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={problem.status}
                      aria-label={t('problems.fields.status')}
                      disabled={isLoading}
                      onChange={(e) =>
                        onStatusChange(problem, e.target.value as ProblemStatus)
                      }
                      className="text-sm border border-border-default rounded-(--radius-control) px-2 py-1 bg-bg-surface text-text-primary"
                    >
                      <option value="active">{t('problems.statuses.active')}</option>
                      <option value="resolved">{t('problems.statuses.resolved')}</option>
                      <option value="inactive">{t('problems.statuses.inactive')}</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(problem)}
                      aria-label={t('common.edit')}
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </Button>

                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(problem.id)}
                        aria-label={t('common.delete')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline confirmation rather than a modal: deleting a problem
                    is destructive but recoverable from the audit trail, and a
                    modal for a two-word decision is heavier than the action. */}
                {confirmingDelete === problem.id && (
                  <div className="mt-3 flex items-center gap-3 rounded-(--radius-control) bg-status-delayed-bg px-3 py-2">
                    <p className="text-sm text-status-delayed-text flex-1">
                      {t('problems.confirmDelete')}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmingDelete(null)}
                    >
                      {t('common.no')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        onDelete?.(problem);
                        setConfirmingDelete(null);
                      }}
                    >
                      {t('common.yes')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
