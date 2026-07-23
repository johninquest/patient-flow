import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useParams, Link } from 'react-router-dom';
import { Card, LoadingSpinner, Button, StatusPill } from '../components/ui';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { Patient } from '../lib/types/patient.types';
import { getCountryName, getCurrencyName } from '../lib/iso-data';
import { AuditTimeline } from '../components/AuditTimeline';

type TabType = 'overview' | 'encounters' | 'tasks' | 'activity';

interface Encounter {
  id: string;
  status: string;
  phase?: string;
  scheduled_time?: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  encounter_id: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  diff?: Record<string, { from: any; to: any }>;
  ip_address?: string;
  created_at: string;
}

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`/api/patients/${id}`),
  });

  const { data: encounters } = useQuery({
    queryKey: ['patient-encounters', id],
    queryFn: () => api.get<Encounter[]>(`/api/encounters?patient_id=${id}`),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['patient-tasks', id],
    queryFn: async () => {
      if (!encounters || encounters.length === 0) return [];
      const allTasks: Task[] = [];
      for (const encounter of encounters) {
        const encounterTasks = await api.get<Task[]>(`/api/tasks?encounter_id=${encounter.id}`);
        allTasks.push(...encounterTasks);
      }
      return allTasks;
    },
    enabled: !!encounters,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['patient-audit', id],
    queryFn: () => api.get<AuditLog[]>(`/api/audit/patient/${id}`),
    enabled: !!id,
  });

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
          {(['overview', 'encounters', 'tasks', 'activity'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              {t(`patients.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
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
            <DetailRow label={t('patients.fields.documentType')} value={patient.identity.document_type} alternate />
            <DetailRow label={t('patients.fields.countryNational')} value={resolvedNationality} />
            <DetailRow label={t('patients.fields.scannedDocument')} value={patient.identity.scanned_document ? t('common.yes') : t('common.no')} alternate />
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
            <DetailRow label={t('patients.fields.emergencyRelation')} value={patient.emergency_contact.relation} />
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
            {patient.transport_logistics.modes && (
              <>
                <DetailRow label={t('patients.fields.transportPublic')} value={patient.transport_logistics.modes.public} alternate />
                <DetailRow label={t('patients.fields.transportTaxi')} value={patient.transport_logistics.modes.taxi} />
                <DetailRow label={t('patients.fields.transportAmbulance')} value={patient.transport_logistics.modes.ambulance} alternate />
              </>
            )}
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
          <h3 className="text-lg font-medium text-text-primary mb-4">
            {t('patients.encounters', 'Encounters')}
          </h3>
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
                        {new Date(encounter.created_at).toLocaleDateString()}
                      </p>
                      {encounter.phase && (
                        <p className="text-xs text-text-secondary mt-1">
                          {t(`encounters.phases.${encounter.phase}`, encounter.phase)}
                        </p>
                      )}
                    </div>
                    <StatusPill
                      status={encounter.status === 'completed' ? 'ready' : encounter.status === 'cancelled' ? 'delayed' : 'waiting'}
                      label={t(`encounters.statuses.${encounter.status}`, encounter.status)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-8">
              {t('patients.noEncounters', 'No encounters recorded')}
            </p>
          )}
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <h3 className="text-lg font-medium text-text-primary mb-4">
            {t('patients.tasks', 'Tasks')}
          </h3>
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
                        {t(`tasks.statuses.${task.status}`, task.status)} · {t(`tasks.priorities.${task.priority}`, task.priority)}
                      </p>
                    </div>
                    <StatusPill
                      status={task.status === 'done' ? 'ready' : task.status === 'in_progress' ? 'in_progress' : 'waiting'}
                      label={t(`tasks.statuses.${task.status}`, task.status)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-8">
              {t('patients.noTasks', 'No tasks assigned')}
            </p>
          )}
        </Card>
      )}

      {activeTab === 'activity' && (
        <AuditTimeline logs={auditLogs || []} title={t('patients.activity', 'Activity History')} />
      )}
    </div>
  );
}
