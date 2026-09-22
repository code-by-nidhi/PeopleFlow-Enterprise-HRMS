import React from 'react';
import { CalendarCheck, Clock, AlarmClock, Hourglass } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { formatHours } from '../../utils/format';

/** Current-month attendance summary as returned in `meta.monthSummary`. */
export function MonthSummaryStats({ summary, loading }) {
  const month = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const pending = loading && !summary;

  return (
    <div className="stats-grid">
      <StatCard label="Days Attended" value={summary?.daysAttended ?? 0} icon={CalendarCheck} subtext={`In ${month}`} loading={pending} />
      <StatCard label="Late Arrivals" value={summary?.late ?? 0} icon={AlarmClock} subtext="Checked in after start time" loading={pending} />
      <StatCard label="Half Days" value={summary?.['half-day'] ?? 0} icon={Clock} subtext="Under 4 working hours" loading={pending} />
      <StatCard label="Total Hours" value={formatHours(summary?.totalHours ?? 0)} icon={Hourglass} subtext={`Logged in ${month}`} loading={pending} />
    </div>
  );
}
