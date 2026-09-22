import React from 'react';
import { CalendarRange } from 'lucide-react';
import { BarChart } from '../../components/charts/BarChart';
import { STATUS_COLORS, CATEGORICAL } from '../../components/charts/palette';
import { ChartCard, sum } from './DashboardWidgets';

/** Last 7 days stacked by attendance state (present / on leave / absent). */
export function AttendanceTrendChart({ trend }) {
  const series = [
    { name: 'Present', color: STATUS_COLORS.good, values: trend.present },
    { name: 'On Leave', color: CATEGORICAL[0], values: trend.onLeave },
    { name: 'Absent', color: STATUS_COLORS.critical, values: trend.absent },
  ];

  return (
    <ChartCard
      title="Attendance — Last 7 Days"
      subtitle="Daily headcount by attendance state"
      icon={CalendarRange}
      isEmpty={!sum(trend.present) && !sum(trend.onLeave) && !sum(trend.absent)}
      emptyText="Check-ins will appear here once employees start recording attendance."
    >
      <BarChart labels={trend.labels} series={series} height={240} stacked />
    </ChartCard>
  );
}
