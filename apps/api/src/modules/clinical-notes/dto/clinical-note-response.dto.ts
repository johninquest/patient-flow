import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NOTE_TYPES } from './create-clinical-note.dto.js';

export class ClinicalNoteResponseDto {
  @ApiProperty({
    description: 'Clinical note ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({ description: 'Patient this note concerns' })
  patient_id: string;

  @ApiProperty({ description: 'Encounter this note documents' })
  encounter_id: string;

  @ApiPropertyOptional({
    description: 'Patient name, resolved for display',
    example: 'Aminata Diallo',
  })
  patient_name?: string | null;

  @ApiProperty({
    description: 'Note type',
    enum: NOTE_TYPES,
    example: 'consultation',
  })
  note_type: string;

  @ApiPropertyOptional({ description: 'SOAP: subjective' })
  subjective: string | null;

  @ApiPropertyOptional({ description: 'SOAP: objective' })
  objective: string | null;

  @ApiPropertyOptional({
    description: 'SOAP: assessment (diagnosis narrative)',
  })
  assessment: string | null;

  @ApiPropertyOptional({ description: 'SOAP: plan (treatment plan)' })
  plan: string | null;

  @ApiPropertyOptional({ description: 'Content outside the SOAP structure' })
  additional_notes: string | null;

  @ApiPropertyOptional({
    description: 'Author user ID. Null if the account was deleted',
  })
  author_user_id: string | null;

  @ApiPropertyOptional({
    description: "Snapshot of the author's name at write time",
    example: 'Dr Amina Bello',
  })
  author_name: string | null;

  @ApiProperty({
    description: "Author's role at write time",
    example: 'provider',
  })
  author_role: string;

  @ApiProperty({
    description:
      'Version. Incremented on each edit; used as an optimistic lock',
    example: 1,
  })
  version: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}

export class ClinicalNoteRevisionResponseDto {
  @ApiProperty({ description: 'Revision ID (uuidv7)' })
  id: string;

  @ApiProperty({ description: 'The note this revision belongs to' })
  note_id: string;

  @ApiProperty({
    description:
      'Revision number. Revision 1 is the original content; revision N is the Nth superseded version',
    example: 1,
  })
  revision_number: number;

  @ApiProperty({ description: 'Note type at the time of this revision' })
  note_type: string;

  @ApiPropertyOptional({ description: 'SOAP: subjective' })
  subjective: string | null;

  @ApiPropertyOptional({ description: 'SOAP: objective' })
  objective: string | null;

  @ApiPropertyOptional({ description: 'SOAP: assessment' })
  assessment: string | null;

  @ApiPropertyOptional({ description: 'SOAP: plan' })
  plan: string | null;

  @ApiPropertyOptional({ description: 'Content outside the SOAP structure' })
  additional_notes: string | null;

  @ApiPropertyOptional({
    description: 'User who made the edit that superseded this content',
  })
  edited_by: string | null;

  @ApiPropertyOptional({
    description: "Snapshot of the editor's name at write time",
  })
  edited_by_name: string | null;

  @ApiProperty({ description: 'When this revision was superseded' })
  created_at: Date;
}
