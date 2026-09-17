import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { DiagnosisCatalogue } from '../types/clinical.types';

/**
 * The ICD-10 diagnosis shortlist used to populate the problem-list picker.
 *
 * Served from the API rather than duplicated in the client so the codes have one
 * source of truth. The list is static, so the app-wide `staleTime` of 5 minutes
 * (see `AppWrapper.tsx`) is already generous — no override is needed.
 */
export function useDiagnoses() {
  return useQuery({
    queryKey: ['diagnoses'],
    queryFn: () => api.get<DiagnosisCatalogue>('/api/diagnoses'),
  });
}
