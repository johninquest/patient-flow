import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api/client';
import { Card, Button, FormInput } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function EncounterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    patient_id: '',
    scheduled_time: '',
    assigned_to: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/api/patients'),
  });

  // Fetch staff for assignment dropdown
  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffMember[]>('/api/users'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.post('/api/encounters', data),
    onSuccess: (encounter: any) => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      navigate(`/encounters/${encounter.id}`);
    },
    onError: (error: Error) => {
      setErrors({ general: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!formData.patient_id) {
      newErrors.patient_id = t('encounters.patientRequired', 'Patient is required');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: Record<string, any> = {
      patient_id: formData.patient_id,
    };

    if (formData.scheduled_time) {
      payload.scheduled_time = formData.scheduled_time;
    }

    if (formData.assigned_to) {
      payload.assigned_to = formData.assigned_to;
    }

    if (formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }

    createMutation.mutate(payload);
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/encounters" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back', 'Back')}</span>
        </Link>
      </div>

      <Card>
        <h2 className="text-xl font-medium text-text-primary mb-6">
          {t('encounters.create', 'Create Encounter')}
        </h2>

        {errors.general && (
          <div className="mb-4 p-3 bg-status-delayed-bg border border-status-delayed-text/20 rounded-[var(--radius-control)]">
            <p className="text-sm text-status-delayed-text">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div>
            <label htmlFor="patient_id" className="block text-sm font-medium text-text-primary mb-1.5">
              {t('encounters.patient', 'Patient')} *
            </label>
            <select
              id="patient_id"
              value={formData.patient_id}
              onChange={handleChange('patient_id')}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              required
            >
              <option value="">{t('encounters.selectPatient', 'Select a patient')}</option>
              {patients?.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
            {errors.patient_id && (
              <p className="mt-1 text-sm text-status-delayed-text">{errors.patient_id}</p>
            )}
          </div>

          {/* Scheduled Time */}
          <FormInput
            label={t('encounters.scheduledTime', 'Scheduled Time')}
            type="datetime-local"
            value={formData.scheduled_time}
            onChange={handleChange('scheduled_time')}
          />

          {/* Assignment */}
          <div>
            <label htmlFor="assigned_to" className="block text-sm font-medium text-text-primary mb-1.5">
              {t('encounters.assignedTo', 'Assign To')}
            </label>
            <select
              id="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange('assigned_to')}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="">{t('encounters.unassigned', 'Unassigned')}</option>
              {staff?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email} ({member.role})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
              {t('encounters.notes', 'Notes')}
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={handleChange('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder={t('encounters.notesPlaceholder', 'Optional notes...')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? t('common.creating', 'Creating...')
                : t('encounters.create', 'Create Encounter')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/encounters')}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
