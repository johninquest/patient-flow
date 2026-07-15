import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useParams, Link } from 'react-router-dom';
import { Card, LoadingSpinner, Button } from '../components/ui';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { Patient } from '../lib/types/patient.types';

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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`/api/patients/${id}`),
  });

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading')} className="py-12" />;
  }

  if (!patient) {
    return <div className="text-center py-12 text-text-secondary">{t('patients.notFound')}</div>;
  }

  const addressStr = patient.address
    ? [patient.address.street, patient.address.postal_code, patient.address.city, patient.address.country]
        .filter(Boolean)
        .join(', ')
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
            <DetailRow label={t('patients.fields.countryNational')} value={patient.identity.country_national} />
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
    </div>
  );
}
