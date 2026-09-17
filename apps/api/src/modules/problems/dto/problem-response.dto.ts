import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROBLEM_STATUSES } from './problem.dto.js';

export class ProblemResponseDto {
  @ApiProperty({
    description: 'Problem ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({ description: 'Patient this problem belongs to' })
  patient_id: string;

  @ApiPropertyOptional({
    description:
      'Encounter where it was recorded. Null if recorded outside a visit, or if the visit was deleted',
  })
  encounter_id: string | null;

  @ApiPropertyOptional({
    description: 'Patient name, resolved for display',
    example: 'Aminata Diallo',
  })
  patient_name?: string | null;

  @ApiProperty({
    description: 'Diagnosis description (free text)',
    example: 'Malaria, unspecified',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'ICD-10 code from the catalogue. Null for off-list entries',
    example: 'B54',
  })
  code: string | null;

  @ApiPropertyOptional({
    description: 'Coding system. "ICD-10" when code is set',
    example: 'ICD-10',
  })
  code_system: string | null;

  @ApiPropertyOptional({
    description: 'Catalogue slug, if picked from the list',
    example: 'malaria',
  })
  diagnosis_slug: string | null;

  @ApiProperty({
    description: 'Problem status',
    enum: PROBLEM_STATUSES,
    example: 'active',
  })
  status: string;

  @ApiPropertyOptional({ description: 'Onset date' })
  onset_date: Date | null;

  @ApiPropertyOptional({ description: 'Resolution date' })
  resolved_date: Date | null;

  @ApiPropertyOptional({
    description: 'User who recorded it. Null if the account was deleted',
  })
  recorded_by: string | null;

  @ApiPropertyOptional({
    description: "Snapshot of the recorder's name at write time",
    example: 'Dr Amina Bello',
  })
  recorded_by_name: string | null;

  @ApiPropertyOptional({ description: 'Additional context' })
  notes: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}
