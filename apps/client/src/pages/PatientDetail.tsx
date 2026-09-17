import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, LoadingSpinner, Button, StatusPill, EmptyState } from '../components/ui';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import type { Patient } from '../lib/types/patient.types';
import { getCountryName, getCurrencyName } from '../lib/iso-data';
import {
  isKnownRelation,
  normalizeTransportModes,
  TRANSPORT_MODE_LABEL_KEYS,
} from '../lib/patient-options';
import { AuditTimeline } from '../components/AuditTimeline';
import { TaskFormModal, type TaskPayload } from '../components/TaskFormModal';
import { ClinicalNoteList } from '../components/ClinicalNoteList';
import { ProblemListPanel } from '../components/ProblemListPanel';
import {
  ProblemFormModal,
  type ProblemPayload,
} from '../components/ProblemFormModal';
import { useAuth } from '../contexts/AuthContext';
import {
  type ClinicalNote,
  type Problem,
  type ProblemStatus,
} from '../lib/types/clinical.types';
import {
  type Encounter,
  type Task,
  type AuditLog,
  type AssignableUser,
  encounterStatusToDesignSystem,
  taskStatusToDesignSystem,
} from '../lib/types/flow.types';

type TabType = 'overview' | 'encounters' | 'tasks' | 'clinical' | 'activity';

/**
 * Roles permitted to read a patient's activity history.
 *
 * Mirrors the API's restriction on `GET /api/audit/patient/:id`. `front_desk` is
 * excluded because audit diffs can include patient `medical` section fields,
 * which that role cannot read on the patient record itself.
 */
const ACTIVITY_ROLES = ['admin', 'provider', 'clinical_staff'];

/**
 * Roles permitted to read and write clinical documentation.
 *
 * Mirrors the API's `@Roles` on the clinical-notes and problems controllers.
 */
const CLINICAL_ROLES = ['admin', 'provider', 'clinical_staff'];

function DetailRow({ label, value, alternate }: { label: string; value?: string | null; alternate?: boolean }) {
  if (!value) return null;
  return (
    <div className={`${alternate ? 'bg-bg-canvas' : 'bg-bg-surface'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary sm:mt-0 sm:col-span-2">{value}</dd>
    </div>
  );
}

export default function PatientDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const locale = i18n.language;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | undefined>();

  const canReadActivity = ACTIVITY_ROLES.includes(user?.role ?? '');
  const canReadClinical = CLINICAL_ROLES.includes(user?.role ?? '');

  // Tabs are only offered to roles the API will actually serve — otherwise the
  // tab 403s on open.
  const tabs: TabType[] = [
    'overview',
    'encounters',
    'tasks',
    ...(canReadClinical ? (['clinical'] as TabType[]) : []),
    ...(canReadActivity ? (['activity'] as TabType[]) : []),
  ];

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`/api/patients/${id}`),
  });

  const { data: encounters } = useQuery({
    queryKey: ['patient-encounters', id],
    queryFn: () => api.get<Encounter[]>(`/api/encounters?patient_id=${id}`),
    enabled: !!id,
  });

  // One request for every task across the patient's encounters. Previously this
  // issued a separate request per encounter, which scaled with visit history.
  const { data: tasks } = useQuery({
    queryKey: ['patient-tasks', id],
    queryFn: () => api.get<Task[]>(`/api/tasks?patient_id=${id}`),
    enabled: !!id,
  });

  const { data: staff } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => api.get<AssignableUser[]>('/api/users/assignable'),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['patient-audit', id],
    queryFn: () => api.get<AuditLog[]>(`/api/audit/patient/${id}`),
    enabled: !!id && canReadActivity,
  });

  const { data: notes } = useQuery({
    queryKey: ['patient-notes', id],
    queryFn: () => api.get<ClinicalNote[]>(`/api/clinical-notes?patient_id=${id}`),
    enabled: !!id && canReadClinical,
  });

  const { data: problems } = useQuery({
    queryKey: ['patient-problems', id],
    queryFn: () => api.get<Problem[]>(`/api/problems?patient_id=${id}`),
    enabled: !!id && canReadClinical,
  });

  /** Everything a problem write can invalidate. */
  const invalidateClinical = () => {
    queryClient.invalidateQueries({ queryKey: ['patient-problems', id] });
    queryClient.invalidateQueries({ queryKey: ['patient-audit', id] });
  };

  const createProblemMutation = useMutation({
    mutationFn: (data: ProblemPayload) => api.post('/api/problems', data),
    onSuccess: () => {
      invalidateClinical();
      setShowProblemModal(false);
    },
  });

  const updateProblemMutation = useMutation({
    mutationFn: ({ problemId, data }: { problemId: string; data: ProblemPayload }) =>
      api.put(`/api/problems/${problemId}`, data),
    onSuccess: () => {
      invalidateClinical();
      setShowProblemModal(false);
      setEditingProblem(undefined);
    },
  });

  const changeProblemStatusMutation = useMutation({
    mutationFn: ({ problemId, status }: { problemId: string; status: ProblemStatus }) =>
      api.put(`/api/problems/${problemId}`, { status }),
    onSuccess: invalidateClinical,
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (problemId: string) => api.delete(`/api/problems/${problemId}`),
    onSuccess: invalidateClinical,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskPayload) => api.post('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['patient-audit', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['flow'] });
      setShowTaskModal(false);
    },
  });

  const hasEncounters = !!encounters && encounters.length > 0;

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  if (!patient) {
    return <div className="text-center py-12 text-text-secondary">{t('patients.notFound')}</div>;
  }

  // Resolve country code to localized name for address display
  const resolvedCountry = patient.address?.country
    ? getCountryName(patient.address.country, locale)
    : null;

  const addressStr = patient.address
    ? [patient.address.street, patient.address.postal_code, patient.address.city, resolvedCountry]
        .filter(Boolean)
        .join(', ')
    : null;

  // Resolve nationality code to localized name
  const resolvedNationality = patient.identity?.country_national
    ? getCountryName(patient.identity.country_national, locale)
    : null;

  // Resolve currency code to localized name
  const resolvedCurrency = patient.financials?.currency
    ? getCurrencyName(patient.financials.currency, locale)
    : null;

  // Standard-list relations are translated; anything else is a legacy free-text
  // value and is shown verbatim rather than as a raw i18n key.
  const storedRelation = patient.emergency_contact?.relation;
  const resolvedRelation = storedRelation
    ? isKnownRelation(storedRelation)
      ? t(`patients.relations.${storedRelation}`)
      : storedRelation
    : null;

  // Transport modes are stored as slugs; render them as translated labels.
  const transportModes = normalizeTransportModes(patient.transport_logistics?.modes);
  const resolvedTransportModes = transportModes.length
    ? transportModes.map((mode) => t(TRANSPORT_MODE_LABEL_KEYS[mode])).join(', ')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
        <Link to={`/patients/${id}/edit`}>
          <Button variant="secondary" size="sm">
            <PencilSquareIcon className="w-4 h-4 mr-1.5" />
            {t('common.edit')}
          </Button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-default">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              {t(`patients.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Core identity */}
          <Card padding="none">
            <div className="px-4 py-5 sm:px-6 border-b border-border-default">
              <h3 className="text-lg font-medium text-text-primary">
                {patient.first_name} {patient.last_name}
              </h3>
            </div>
            <dl>
              <DetailRow label={t('patients.email')} value={patient.email} alternate />
              <DetailRow label={t('patients.phone')} value={patient.phone} />
              <DetailRow label={t('patients.dateOfBirth')} value={patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : null} alternate />
            </dl>
          </Card>

      {/* Identity section */}
      {patient.identity && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.identity')}</h4>
          </div>
          <dl>
            <DetailRow
              label={t('patients.fields.documentType')}
              value={
                patient.identity.document_type === 'national_id'
                  ? t('patients.fields.documentTypeNationalId')
                  : patient.identity.document_type === 'passport'
                    ? t('patients.fields.documentTypePassport')
                    : patient.identity.document_type
              }
              alternate
            />
            <DetailRow label={t('patients.fields.documentNumber')} value={patient.identity.document_number} />
            <DetailRow label={t('patients.fields.countryNational')} value={resolvedNationality} alternate />
            <DetailRow label={t('patients.fields.scannedDocument')} value={patient.identity.scanned_document ? t('common.yes') : t('common.no')} />
          </dl>
        </Card>
      )}

      {/* Contact / Address section */}
      {addressStr && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.contact')}</h4>
          </div>
          <dl>
            <DetailRow label={t('patients.address')} value={addressStr} alternate />
          </dl>
        </Card>
      )}

      {/* Financials section */}
      {patient.financials && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.financials')}</h4>
          </div>
          <dl>
            <DetailRow label={t('patients.fields.healthInsurance')} value={patient.financials.health_insurance} alternate />
            <DetailRow label={t('patients.fields.reimbursement')} value={patient.financials.reimbursement} />
            <DetailRow label={t('patients.fields.currency')} value={resolvedCurrency} alternate />
          </dl>
        </Card>
      )}

      {/* Emergency contact section */}
      {patient.emergency_contact && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.emergency')}</h4>
          </div>
          <dl>
            <DetailRow label={t('patients.fields.emergencyName')} value={patient.emergency_contact.name} alternate />
            <DetailRow label={t('patients.fields.emergencyRelation')} value={resolvedRelation} />
            <DetailRow label={t('patients.phone')} value={patient.emergency_contact.phone} alternate />
            <DetailRow label={t('patients.email')} value={patient.emergency_contact.email} />
            <DetailRow label={t('patients.fields.emergencyComments')} value={patient.emergency_contact.comments} alternate />
          </dl>
        </Card>
      )}

      {/* Medical section */}
      {(patient.medical_history || patient.physicians) && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.medical')}</h4>
          </div>
          <dl>
            <DetailRow label={t('patients.fields.medicalHistory')} value={patient.medical_history} alternate />
            <DetailRow label={t('patients.fields.medicalHistoryDate')} value={patient.medical_history_date ? new Date(patient.medical_history_date).toLocaleDateString() : null} />
            {patient.physicians && (
              <>
                <DetailRow label={t('patients.fields.attendingPhysician')} value={patient.physicians.attending} alternate />
                <DetailRow label={t('patients.fields.correspondentPhysician')} value={patient.physicians.correspondent} />
                <DetailRow label={t('patients.fields.otherPhysician')} value={patient.physicians.other} alternate />
              </>
            )}
          </dl>
        </Card>
      )}

      {/* Transport logistics section */}
      {patient.transport_logistics && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.transport')}</h4>
          </div>
          <dl>
            <DetailRow label={t('patients.fields.transportModes')} value={resolvedTransportModes} alternate />
            <DetailRow label={t('patients.fields.transportComments')} value={patient.transport_logistics.comments} />
          </dl>
        </Card>
      )}

      {/* Notes section */}
      {patient.notes && (
        <Card padding="none">
          <div className="px-4 py-5 sm:px-6 border-b border-border-default">
            <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.notes')}</h4>
          </div>
          <div className="px-4 py-5 sm:px-6">
            <p className="text-sm text-text-primary whitespace-pre-wrap">{patient.notes}</p>
          </div>
        </Card>
      )}
        </>
      )}

      {activeTab === 'encounters' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">
              {t('patients.encounters')}
            </h3>
            {/* Carries the patient through to the encounter form, which
                pre-selects and locks it. */}
            <Link to={`/encounters/new?patient_id=${id}`}>
              <Button size="sm">
                <PlusIcon className="w-4 h-4 mr-1.5" />
                {t('patients.createEncounter')}
              </Button>
            </Link>
          </div>
          {encounters && encounters.length > 0 ? (
            <div className="space-y-3">
              {encounters.map((encounter) => (
                <Link
                  key={encounter.id}
                  to={`/encounters/${encounter.id}`}
                  className="block p-4 border border-border-default rounded-lg hover:bg-bg-canvas transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(encounter.created_at).toLocaleDateString(locale)}
                      </p>
                      {encounter.phase && (
                        <p className="text-xs text-text-secondary mt-1">
                          {t(`encounters.phases.${encounter.phase}`)}
                        </p>
                      )}
                    </div>
                    <StatusPill
                      status={encounterStatusToDesignSystem(encounter.status)}
                      label={t(`encounters.statuses.${encounter.status}`)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-8">
              {t('patients.noEncounters')}
            </p>
          )}
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">
              {t('patients.tasks')}
            </h3>
            {/* A task always belongs to an encounter, so with none on file there
                is nothing to file it under. Explained rather than silently
                disabled, and the empty state below offers the way forward. */}
            <Button
              size="sm"
              onClick={() => setShowTaskModal(true)}
              disabled={!hasEncounters}
              title={
                hasEncounters ? undefined : t('patients.tasksRequireEncounter')
              }
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              {t('patients.createTask')}
            </Button>
          </div>

          {!hasEncounters && (
            <p className="text-sm text-text-secondary mb-4">
              {t('patients.tasksRequireEncounter')}
            </p>
          )}

          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-border-default rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{task.title}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {t(`tasks.statuses.${task.status}`)} · {t(`tasks.priorities.${task.priority}`)}
                      </p>
                    </div>
                    <StatusPill
                      status={taskStatusToDesignSystem(task.status)}
                      label={t(`tasks.statuses.${task.status}`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardDocumentListIcon className="w-12 h-12" />}
              title={t('patients.noTasks')}
              description={
                hasEncounters
                  ? t('patients.noTasksDescription')
                  : t('patients.tasksRequireEncounter')
              }
              action={
                hasEncounters
                  ? undefined
                  : {
                      label: t('patients.createEncounter'),
                      onClick: () => navigate(`/encounters/new?patient_id=${id}`),
                    }
              }
            />
          )}
        </Card>
      )}

      {activeTab === 'clinical' && canReadClinical && (
        <div className="space-y-8">
          {/* Notes are read-only here: they document a specific visit, so they
              are authored from the encounter they belong to. This view is for
              reading the patient's documented history in one place. */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-text-primary">
                {t('clinicalNotes.title')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {t('clinicalNotes.patientViewHint')}
              </p>
            </div>
            <ClinicalNoteList
              notes={notes || []}
              currentUserId={user?.id}
              currentUserRole={user?.role}
            />
          </div>

          <ProblemListPanel
            problems={problems || []}
            isLoading={changeProblemStatusMutation.isPending}
            onAdd={() => {
              setEditingProblem(undefined);
              setShowProblemModal(true);
            }}
            onEdit={(problem) => {
              setEditingProblem(problem);
              setShowProblemModal(true);
            }}
            onStatusChange={(problem, status) =>
              changeProblemStatusMutation.mutate({ problemId: problem.id, status })
            }
            // Deletion is admin-only in the API; only offer the control to
            // admins so the button never 403s.
            onDelete={
              user?.role === 'admin'
                ? (problem) => deleteProblemMutation.mutate(problem.id)
                : undefined
            }
          />
        </div>
      )}

      {activeTab === 'activity' && canReadActivity && (
        <AuditTimeline logs={auditLogs || []} title={t('patients.activity')} />
      )}

      <ProblemFormModal
        key={editingProblem?.id ?? 'new-problem'}
        isOpen={showProblemModal}
        onClose={() => {
          setShowProblemModal(false);
          setEditingProblem(undefined);
        }}
        onSubmit={(data) => {
          if (editingProblem) {
            updateProblemMutation.mutate({ problemId: editingProblem.id, data });
          } else {
            createProblemMutation.mutate(data);
          }
        }}
        patientId={id!}
        isLoading={createProblemMutation.isPending || updateProblemMutation.isPending}
        title={editingProblem ? t('problems.edit') : t('problems.add')}
        initialData={editingProblem}
      />

      <TaskFormModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        // Scoped to this patient's encounters: filing a task under another
        // patient's encounter from here would be a data-entry error.
        encounters={encounters || []}
        staff={staff || []}
        isLoading={createTaskMutation.isPending}
        title={t('patients.createTask')}
      />
    </div>
  );
}
