import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, FormInput } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { Patient } from '../lib/types/patient.types';
import { canWriteSection } from '../lib/types/patient.types';

export default function PatientForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const role = user?.role ?? 'front_desk';
  const isEdit = !!id;

  const { data: existingPatient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`/api/patients/${id}`),
    enabled: isEdit,
  });

  const [formData, setFormData] = useState<Record<string, any>>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: { street: '', postal_code: '', city: '', country: '' },
    identity: { document_type: '', country_national: '', scanned_document: false },
    financials: { health_insurance: '', reimbursement: '' },
    emergency_contact: { name: '', relation: '', phone: '', email: '', comments: '' },
    medical_history: '',
    medical_history_date: '',
    physicians: { attending: '', correspondent: '', other: '' },
    transport_logistics: { modes: { public: '', taxi: '', ambulance: '' }, comments: '' },
    notes: '',
  });

  useEffect(() => {
    if (isEdit && existingPatient) {
      setFormData({
        first_name: existingPatient.first_name ?? '',
        last_name: existingPatient.last_name ?? '',
        date_of_birth: existingPatient.date_of_birth ? existingPatient.date_of_birth.split('T')[0] : '',
        phone: existingPatient.phone ?? '',
        email: existingPatient.email ?? '',
        address: { street: '', postal_code: '', city: '', country: '', ...existingPatient.address },
        identity: { document_type: '', country_national: '', scanned_document: false, ...existingPatient.identity },
        financials: { health_insurance: '', reimbursement: '', ...existingPatient.financials },
        emergency_contact: { name: '', relation: '', phone: '', email: '', comments: '', ...existingPatient.emergency_contact },
        medical_history: existingPatient.medical_history ?? '',
        medical_history_date: existingPatient.medical_history_date ? existingPatient.medical_history_date.split('T')[0] : '',
        physicians: { attending: '', correspondent: '', other: '', ...existingPatient.physicians },
        transport_logistics: { modes: { public: '', taxi: '', ambulance: '' }, comments: '', ...existingPatient.transport_logistics },
        notes: existingPatient.notes ?? '',
      });
    }
  }, [isEdit, existingPatient]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) => {
      if (isEdit) {
        return api.put(`/api/patients/${id}`, data);
      }
      return api.post('/api/patients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['patient', id] });
      navigate(isEdit ? `/patients/${id}` : '/patients');
    },
    onError: (error: Error) => {
      setErrors({ first_name: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.first_name.trim()) {
      newErrors.first_name = t('patients.firstName') + ' is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = t('patients.lastName') + ' is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build payload — only include non-empty fields
    const payload: Record<string, any> = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
    };

    if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
    if (formData.phone) payload.phone = formData.phone.trim();
    if (formData.email) payload.email = formData.email.trim();

    // Address (contact section)
    if (canWriteSection(role, 'contact')) {
      const addr = formData.address;
      if (addr && (addr.street || addr.postal_code || addr.city || addr.country)) {
        payload.address = {
          street: addr.street || undefined,
          postal_code: addr.postal_code || undefined,
          city: addr.city || undefined,
          country: addr.country || undefined,
        };
      }
    }

    // Identity section
    if (canWriteSection(role, 'identity')) {
      const ident = formData.identity;
      if (ident && (ident.document_type || ident.country_national || ident.scanned_document)) {
        payload.identity = {
          document_type: ident.document_type || undefined,
          country_national: ident.country_national || undefined,
          scanned_document: ident.scanned_document ?? undefined,
        };
      }
    }

    // Financials section
    if (canWriteSection(role, 'financials')) {
      const fin = formData.financials;
      if (fin && (fin.health_insurance || fin.reimbursement)) {
        payload.financials = {
          health_insurance: fin.health_insurance || undefined,
          reimbursement: fin.reimbursement || undefined,
        };
      }
    }

    // Emergency contact section
    if (canWriteSection(role, 'emergency')) {
      const ec = formData.emergency_contact;
      if (ec && (ec.name || ec.relation || ec.phone || ec.email || ec.comments)) {
        payload.emergency_contact = {
          name: ec.name || undefined,
          relation: ec.relation || undefined,
          phone: ec.phone || undefined,
          email: ec.email || undefined,
          comments: ec.comments || undefined,
        };
      }
    }

    // Medical section
    if (canWriteSection(role, 'medical')) {
      if (formData.medical_history) payload.medical_history = formData.medical_history.trim();
      if (formData.medical_history_date) payload.medical_history_date = formData.medical_history_date;
      const phys = formData.physicians;
      if (phys && (phys.attending || phys.correspondent || phys.other)) {
        payload.physicians = {
          attending: phys.attending || undefined,
          correspondent: phys.correspondent || undefined,
          other: phys.other || undefined,
        };
      }
    }

    // Transport section
    if (canWriteSection(role, 'transport')) {
      const tl = formData.transport_logistics;
      if (tl) {
        const modes = tl.modes;
        const hasModes = modes && (modes.public || modes.taxi || modes.ambulance);
        if (hasModes || tl.comments) {
          payload.transport_logistics = {
            modes: hasModes ? {
              public: modes.public || undefined,
              taxi: modes.taxi || undefined,
              ambulance: modes.ambulance || undefined,
            } : undefined,
            comments: tl.comments || undefined,
          };
        }
      }
    }

    // Notes section
    if (canWriteSection(role, 'notes')) {
      if (formData.notes) payload.notes = formData.notes.trim();
    }

    saveMutation.mutate(payload);
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleNestedChange = (section: string, field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: e.target.value },
    }));
  };

  const handleDeepNestedChange = (section: string, subSection: string, field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: { ...prev[section][subSection], [field]: e.target.value },
      },
    }));
  };

  const handleCheckboxChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      identity: { ...prev.identity, [field]: e.target.checked },
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <Link to={isEdit ? `/patients/${id}` : '/patients'} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <Card padding="none">
        <div className="px-4 py-5 sm:px-6 border-b border-border-default">
          <h3 className="text-lg font-medium text-text-primary">
            {isEdit ? t('common.edit') : t('patients.create')}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-5 sm:px-6 space-y-8">
          {/* Core identity — always editable */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormInput
                label={t('patients.firstName')}
                value={formData.first_name}
                onChange={handleChange('first_name')}
                error={errors.first_name}
                required
              />
              <FormInput
                label={t('patients.lastName')}
                value={formData.last_name}
                onChange={handleChange('last_name')}
                error={errors.last_name}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormInput
                label={t('patients.dateOfBirth')}
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange('date_of_birth')}
                error={errors.date_of_birth}
              />
              <FormInput
                label={t('patients.phone')}
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={errors.phone}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <FormInput
              label={t('patients.email')}
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={errors.email}
              placeholder="patient@example.com"
            />
          </div>

          {/* Identity section */}
          {canWriteSection(role, 'identity') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.identity')}</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormInput
                  label={t('patients.fields.documentType')}
                  value={formData.identity.document_type}
                  onChange={handleNestedChange('identity', 'document_type')}
                />
                <FormInput
                  label={t('patients.fields.countryNational')}
                  value={formData.identity.country_national}
                  onChange={handleNestedChange('identity', 'country_national')}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={formData.identity.scanned_document ?? false}
                  onChange={handleCheckboxChange('scanned_document')}
                  className="w-4 h-4 rounded-(--radius-control) border-border-default"
                />
                {t('patients.fields.scannedDocument')}
              </label>
            </div>
          )}

          {/* Contact / Address section */}
          {canWriteSection(role, 'contact') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.contact')}</h4>
              <FormInput
                label={t('patients.fields.addressStreet')}
                value={formData.address.street}
                onChange={handleNestedChange('address', 'street')}
              />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormInput
                  label={t('patients.fields.addressPostalCode')}
                  value={formData.address.postal_code}
                  onChange={handleNestedChange('address', 'postal_code')}
                />
                <FormInput
                  label={t('patients.fields.addressCity')}
                  value={formData.address.city}
                  onChange={handleNestedChange('address', 'city')}
                />
                <FormInput
                  label={t('patients.fields.addressCountry')}
                  value={formData.address.country}
                  onChange={handleNestedChange('address', 'country')}
                />
              </div>
            </div>
          )}

          {/* Financials section */}
          {canWriteSection(role, 'financials') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.financials')}</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormInput
                  label={t('patients.fields.healthInsurance')}
                  value={formData.financials.health_insurance}
                  onChange={handleNestedChange('financials', 'health_insurance')}
                />
                <FormInput
                  label={t('patients.fields.reimbursement')}
                  value={formData.financials.reimbursement}
                  onChange={handleNestedChange('financials', 'reimbursement')}
                />
              </div>
            </div>
          )}

          {/* Emergency contact section */}
          {canWriteSection(role, 'emergency') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.emergency')}</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormInput
                  label={t('patients.fields.emergencyName')}
                  value={formData.emergency_contact.name}
                  onChange={handleNestedChange('emergency_contact', 'name')}
                />
                <FormInput
                  label={t('patients.fields.emergencyRelation')}
                  value={formData.emergency_contact.relation}
                  onChange={handleNestedChange('emergency_contact', 'relation')}
                />
                <FormInput
                  label={t('patients.phone')}
                  type="tel"
                  value={formData.emergency_contact.phone}
                  onChange={handleNestedChange('emergency_contact', 'phone')}
                />
                <FormInput
                  label={t('patients.email')}
                  type="email"
                  value={formData.emergency_contact.email}
                  onChange={handleNestedChange('emergency_contact', 'email')}
                />
              </div>
              <div>
                <label htmlFor="emergency_comments" className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('patients.fields.emergencyComments')}
                </label>
                <textarea
                  id="emergency_comments"
                  rows={2}
                  value={formData.emergency_contact.comments}
                  onChange={handleNestedChange('emergency_contact', 'comments')}
                  className="w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Medical section */}
          {canWriteSection(role, 'medical') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.medical')}</h4>
              <FormInput
                label={t('patients.fields.medicalHistoryDate')}
                type="date"
                value={formData.medical_history_date}
                onChange={handleChange('medical_history_date')}
              />
              <div>
                <label htmlFor="medical_history" className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('patients.fields.medicalHistory')}
                </label>
                <textarea
                  id="medical_history"
                  rows={4}
                  value={formData.medical_history}
                  onChange={handleChange('medical_history')}
                  className="w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormInput
                  label={t('patients.fields.attendingPhysician')}
                  value={formData.physicians.attending}
                  onChange={handleNestedChange('physicians', 'attending')}
                />
                <FormInput
                  label={t('patients.fields.correspondentPhysician')}
                  value={formData.physicians.correspondent}
                  onChange={handleNestedChange('physicians', 'correspondent')}
                />
                <FormInput
                  label={t('patients.fields.otherPhysician')}
                  value={formData.physicians.other}
                  onChange={handleNestedChange('physicians', 'other')}
                />
              </div>
            </div>
          )}

          {/* Transport section */}
          {canWriteSection(role, 'transport') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.transport')}</h4>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormInput
                  label={t('patients.fields.transportPublic')}
                  value={formData.transport_logistics.modes.public}
                  onChange={handleDeepNestedChange('transport_logistics', 'modes', 'public')}
                />
                <FormInput
                  label={t('patients.fields.transportTaxi')}
                  value={formData.transport_logistics.modes.taxi}
                  onChange={handleDeepNestedChange('transport_logistics', 'modes', 'taxi')}
                />
                <FormInput
                  label={t('patients.fields.transportAmbulance')}
                  value={formData.transport_logistics.modes.ambulance}
                  onChange={handleDeepNestedChange('transport_logistics', 'modes', 'ambulance')}
                />
              </div>
              <div>
                <label htmlFor="transport_comments" className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('patients.fields.transportComments')}
                </label>
                <textarea
                  id="transport_comments"
                  rows={2}
                  value={formData.transport_logistics.comments}
                  onChange={handleNestedChange('transport_logistics', 'comments')}
                  className="w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Notes section */}
          {canWriteSection(role, 'notes') && (
            <div className="space-y-4 pt-6 border-t border-border-default">
              <h4 className="text-sm font-medium text-text-primary">{t('patients.sections.notes')}</h4>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('patients.notes')}
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  className="w-full px-3 py-2 border border-border-default rounded-(--radius-control) bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? `/patients/${id}` : '/patients')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={saveMutation.isPending}
            >
              {isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
