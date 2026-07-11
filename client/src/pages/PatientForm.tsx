import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api/client';
import { Card, Button, FormInput } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface PatientFormData {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export default function PatientForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData, string>>>({});

  const createPatient = useMutation({
    mutationFn: (data: PatientFormData) => api.post('/api/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (error: Error) => {
      setErrors({ first_name: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Partial<Record<keyof PatientFormData, string>> = {};
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

    const payload: PatientFormData = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
    };

    if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
    if (formData.phone) payload.phone = formData.phone.trim();
    if (formData.email) payload.email = formData.email.trim();
    if (formData.address) payload.address = formData.address.trim();
    if (formData.notes) payload.notes = formData.notes.trim();

    createPatient.mutate(payload);
  };

  const handleChange = (field: keyof PatientFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <Card padding="none">
        <div className="px-4 py-5 sm:px-6 border-b border-border-default">
          <h3 className="text-lg font-medium text-text-primary">{t('patients.create')}</h3>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-5 sm:px-6 space-y-6">
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

          <FormInput
            label={t('patients.address')}
            value={formData.address}
            onChange={handleChange('address')}
            error={errors.address}
          />

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/patients')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={createPatient.isPending}
            >
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
