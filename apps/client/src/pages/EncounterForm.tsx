import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api/client';
import { Card, Button, FormInput, FormSelect } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ApiError } from '../lib/api/errors';
import type { AssignableUser } from '../lib/types/flow.types';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
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
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch patients for dropdown
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/api/patients'),
  });

  // Fetch staff for assignment dropdown. Uses the assignable endpoint because
  // GET /api/users is admin-only and would 403 for other roles.
  const { data: staff } = useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: () => api.get<AssignableUser[]>('/api/users/assignable'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.post('/api/encounters', data),
    onSuccess: (encounter: any) => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      navigate(`/encounters/${encounter.id}`);
    },
    onError: (error: Error) => {
      if (error instanceof ApiError) {
        if (error.hasFieldErrors()) {
          setErrors(error.toFieldErrorMap());
          setGeneralError(null);
        } else {
          setGeneralError(error.message);
          setErrors({});
        }
      } else {
        setGeneralError(error.message);
        setErrors({});
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const newErrors: Record<string, string> = {};
    if (!formData.patient_id) {
      newErrors.patient_id = t('encounters.patientRequired');
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
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <Card>
        <h2 className="text-xl font-medium text-text-primary mb-6">
          {t('encounters.create')}
        </h2>

        {generalError && (
          <div className="mb-4 p-3 bg-status-delayed-bg border border-status-delayed-text/20 rounded-[var(--radius-control)]">
            <p className="text-sm text-status-delayed-text">{generalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <FormSelect
            label={t('encounters.patient')}
            value={formData.patient_id}
            placeholder={t('encounters.selectPatient')}
            options={(patients || []).map((patient) => ({
              value: patient.id,
              label: `${patient.first_name} ${patient.last_name}`,
            }))}
            onChange={handleChange('patient_id')}
            error={errors.patient_id}
            required
          />

          {/* Scheduled Time */}
          <FormInput
            label={t('encounters.scheduledTime')}
            type="datetime-local"
            value={formData.scheduled_time}
            onChange={handleChange('scheduled_time')}
          />

          {/* Assignment */}
          <FormSelect
            label={t('encounters.assignedTo')}
            value={formData.assigned_to}
            placeholder={t('encounters.unassigned')}
            options={(staff || []).map((member) => ({
              value: member.id,
              label: `${member.name || member.email} (${t(`staff.roles.${member.role}`, member.role)})`,
            }))}
            onChange={handleChange('assigned_to')}
          />

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1.5">
              {t('encounters.notes')}
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={handleChange('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder={t('encounters.notesPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? t('common.creating')
                : t('encounters.create')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/encounters')}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
