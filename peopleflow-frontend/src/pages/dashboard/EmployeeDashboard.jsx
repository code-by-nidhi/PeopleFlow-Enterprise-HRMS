import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CalendarDays, CheckSquare, Target, LogIn, LogOut, TrendingUp, PieChart as PieIcon, ListChecks, CalendarClock, Timer,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { ProgressList } from '../../components/charts/ProgressList';
import { CATEGORICAL, STATUS_COLORS } from '../../components/charts/palette';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dashboardApi } from '../../api/endpoints';
import { AttendanceCheckFlow } from '../attendance/verification/AttendanceCheckFlow';
import { LEAVE_TYPE_LABELS } from '../../utils/constants';
import { formatDateRange, formatDuration, formatHours, formatShortDate, formatTime, isOverdue } from '../../utils/format';
import { ChartCard, DashboardError, DashboardSkeleton, ListRow, ViewAllButton, sum } from './DashboardWidgets';

const ANNUAL_LEAVE = { casual: 12, sick: 8, earned: 15 };

function TodayCard({ today, onChange }) {
  const [now, setNow] = useState(() => Date.now());
  const [flowAction, setFlowAction] = useState(null);
  const running = today && !today.checkOut;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const closeFlow = useCallback(() => {
    setFlowAction(null);
    onChange();
  }, [onChange]);

  let heading = 'Not checked in yet';
  let detail = 'Record your arrival to start today’s shift';
  if (running) {
    heading = formatDuration(now - new Date(today.checkIn).getTime());
    detail = `Checked in at ${formatTime(today.checkIn)}${today.status === 'late' ? ' · marked late' : ''}`;
  } else if (today) {
    heading = formatHours(today.workingHours);
    detail = `${formatTime(today.checkIn)} – ${formatTime(today.checkOut)} · shift complete`;
  }

  return (
    <div className="card card-highlight checkin-card section-gap">
      <div className="row" style={{ gap: '1rem' }}>
        <div className="stat-icon-wrapper" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'transparent', color: '#38bdf8' }}>
          <Timer size={22} />
        </div>
        <div>
          <span className="text-xs text-bold" style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Today&apos;s shift
          </span>
          <div className="checkin-clock">{heading}</div>
          <span className="text-sm" style={{ color: '#cbd5e1' }}>{detail}</span>
        </div>
      </div>
      <div className="row">
        {!today && <Button variant="accent" size="lg" icon={LogIn} disabled={Boolean(flowAction)} onClick={() => setFlowAction('check-in')}>Check In</Button>}
        {running && <Button variant="secondary" size="lg" icon={LogOut} disabled={Boolean(flowAction)} onClick={() => setFlowAction('check-out')}>Check Out</Button>}
      </div>
      <AttendanceCheckFlow action={flowAction} onClose={closeFlow} />
    </div>
  );
}

export function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const { data, loading, error, reload } = useFetch((config) => dashboardApi.get(undefined, config), [version]);

  const header = (
    <PageHeader title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`} subtitle="Your attendance, leave balance and assigned work at a glance">
      <Button variant="secondary" icon={CalendarDays} onClick={() => navigate('/leaves/my')}>
        Apply Leave
      </Button>
      <Button icon={CheckSquare} onClick={() => navigate('/tasks/my')}>
        My Tasks
      </Button>
    </PageHeader>
  );

  if (!data) {
    return (
      <div>
        {header}
        {loading ? <DashboardSkeleton /> : <DashboardError message={error} onRetry={reload} />}
      </div>
    );
  }

  const { stats, attendanceBreakdown: ab, leaveBalance, taskStatus } = data;
  const breakdown = [
    { label: 'Present', value: ab.present, color: STATUS_COLORS.good },
    { label: 'Late', value: ab.late, color: STATUS_COLORS.warning },
    { label: 'Half Day', value: ab.halfDay, color: STATUS_COLORS.serious },
    { label: 'On Leave', value: ab.onLeave, color: CATEGORICAL[0] },
    { label: 'Absent', value: ab.absent, color: STATUS_COLORS.critical },
  ];

  return (
    <div>
      {header}

      <TodayCard today={data.today} onChange={reload} />

      <div className="stats-grid">
        <StatCard label="Hours This Week" value={formatHours(stats.hoursThisWeek)} icon={Clock} subtext="Including today's shift" />
        <StatCard label="Attendance" value={`${stats.attendanceRate}%`} icon={Target} subtext={`${stats.daysAttended} of ${stats.workingDaysSoFar} working days`} />
        <StatCard label="Leave Balance" value={stats.leaveBalanceTotal} icon={CalendarDays} subtext="Days available" />
        <StatCard label="Open Tasks" value={stats.openTasks} icon={CheckSquare} subtext={stats.overdueTasks ? `${stats.overdueTasks} overdue` : `${stats.dueToday} due today`} />
      </div>

      <div className="grid-2 section-gap">
        <ChartCard
          title="Hours Logged This Week"
          subtitle="Working hours from check-in records"
          icon={TrendingUp}
          isEmpty={!sum(data.weeklyHours.values)}
          emptyText="Check in to start tracking your working hours."
        >
          <BarChart labels={data.weeklyHours.labels} series={[{ name: 'Hours', color: CATEGORICAL[0], values: data.weeklyHours.values }]} height={240} unit="h" />
        </ChartCard>

        <ChartCard
          title="This Month's Attendance"
          subtitle={`${formatHours(ab.totalHours)} logged so far`}
          icon={PieIcon}
          isEmpty={!sum(breakdown.map((b) => b.value))}
          emptyText="Your attendance breakdown will appear after your first working day."
        >
          <DonutChart data={breakdown.filter((b) => b.value > 0)} centerValue={stats.workingDaysSoFar} centerLabel="Working days" />
        </ChartCard>
      </div>

      <div className="grid-2 section-gap">
        <ChartCard
          title="Tasks Completed"
          subtitle={`${taskStatus.completed} completed in total`}
          icon={ListChecks}
          isEmpty={!sum(data.taskCompletionTrend.values)}
          emptyText="Completed tasks from the last four weeks will be charted here."
        >
          <LineChart labels={data.taskCompletionTrend.labels} series={[{ name: 'Tasks completed', color: CATEGORICAL[0], values: data.taskCompletionTrend.values }]} height={240} area />
        </ChartCard>

        <ChartCard title="Leave Balance" subtitle="Remaining days by leave type" icon={CalendarClock} action={<ViewAllButton to="/leaves/my" />}>
          <ProgressList
            items={Object.entries(ANNUAL_LEAVE).map(([type, total]) => ({
              label: LEAVE_TYPE_LABELS[type],
              value: leaveBalance[type] ?? 0,
              max: Math.max(total, leaveBalance[type] ?? 0),
              color: CATEGORICAL[0],
              caption: `${leaveBalance[type] ?? 0} of ${total} days left`,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard
          title="My Upcoming Tasks"
          subtitle="Open work ordered by due date"
          icon={CheckSquare}
          isEmpty={!data.upcomingTasks.length}
          emptyText="Nothing on your plate right now."
          action={<ViewAllButton to="/tasks/my" />}
        >
          <div className="stack-sm">
            {data.upcomingTasks.map((task) => (
              <ListRow
                key={task._id}
                title={task.title}
                meta={`Due ${formatShortDate(task.deadline)}`}
                status={isOverdue(task) ? 'overdue' : task.status === 'in-progress' ? 'in-progress' : task.priority}
                onClick={() => navigate(`/tasks/${task._id}`)}
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Recent Leave Requests"
          subtitle="Your latest applications"
          icon={CalendarDays}
          isEmpty={!data.recentLeaves.length}
          emptyText="You haven't applied for leave yet."
          action={<ViewAllButton to="/leaves/my" />}
        >
          <div className="stack-sm">
            {data.recentLeaves.map((leave) => (
              <ListRow
                key={leave._id}
                title={LEAVE_TYPE_LABELS[leave.leaveType]}
                meta={`${formatDateRange(leave.startDate, leave.endDate)} · ${leave.days} day${leave.days === 1 ? '' : 's'}`}
                status={leave.status}
                onClick={() => navigate(`/leaves/${leave._id}`)}
              />
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
