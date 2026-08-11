import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of patients',
    example: 142,
  })
  totalPatients: number;

  @ApiProperty({
    description: 'Active encounters (not completed or cancelled)',
    example: 7,
  })
  activeEncounters: number;

  @ApiProperty({
    description: 'Pending tasks (status = todo)',
    example: 12,
  })
  pendingTasks: number;

  @ApiProperty({
    description: "Today's encounters",
    example: 3,
  })
  todayEncounters: number;
}
