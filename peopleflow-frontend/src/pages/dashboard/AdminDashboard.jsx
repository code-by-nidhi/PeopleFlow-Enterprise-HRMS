import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, CalendarDays, CheckSquare, PieChart as PieIcon, ShieldCheck, ListChecks, UserPlus, Building2, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { DonutChart } from '../../components/charts/DonutChart';
import { ProgressList } from '../../components/charts/ProgressList';
import { CATEGORICAL, STATUS_COLORS, withCategoricalColors } from '../../components/charts/palette';
import { useFetch } from '../../hooks/useFetch';
import { useNotifications } from '../../context/NotificationContext';
import { dashboardApi } from '../../api/endpoints';
import { ROLE_LABELS } from '../../utils/constants';
import { formatDate, formatShortDate, isOverdue } from '../../utils/format';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { ChartCard, DashboardError, DashboardSkeleton, ListRow, ViewAllButton } from './DashboardWidgets';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { version } = useNotifications();
  const { data, loading, error, reload } = useFetch((config) => dashboardApi.get(undefined, config), [version]);

  const header = (
    <PageHeader title="Admin Dashboard" subtitle="Organisation-wide workforce, access and operations overview">
      <Button variant="secondary" icon={ShieldCheck} onClick={() => navigate('/users/create')}>
        Create Account
      </Button>
      <Button icon={UserPlus} onClick={() => navigate('/employees/add')}>
        Add Employee
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

  const { stats, taskStatus, usersByRole } = data;
  const totalAccounts = Object.values(usersByRole).reduce((a, b) => a + b, 0);
  const totalTasks = taskStatus.pending + taskStatus.inProgress + taskStatus.completed;

  return (
    <div>
      {header}

      <div className="stats-grid">
        <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} subtext={`Across ${stats.departments} departments`} />
        <StatCard label="Present Today" value={stats.presentToday} icon={Clock} subtext={`${stats.attendanceRate}% of ${stats.activeEmployees} active`} />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves} icon={CalendarDays} subtext="Awaiting review" />
        <StatCard label="Active Tasks" value={stats.activeTasks} icon={CheckSquare} subtext={`${stats.overdueTasks} overdue`} />
      </div>

      <div className="grid-2 section-gap">
        <AttendanceTrendChart trend={data.attendanceTrend} />

        <ChartCard
          title="Department Distribution"
          subtitle="Headcount by department"
          icon={PieIcon}
          isEmpty={!data.departmentDistribution.length}
          emptyText="Add employees to departments to see the distribution."
        >
          <DonutChart
            data={withCategoricalColors(data.departmentDistribution)}
            centerValue={stats.totalEmployees}
            centerLabel="Employees"
          />
        </ChartCard>
      </div>

      <div className="grid-2 section-gap">
        <ChartCard title="Accounts by Role" subtitle={`${totalAccounts} login accounts`} icon={ShieldCheck} action={<ViewAllButton to="/users" />}>
          <ProgressList
            items={['admin', 'hr', 'manager', 'employee'].map((role) => ({
              label: ROLE_LABELS[role],
              value: usersByRole[role] || 0,
              max: totalAccounts || 1,
              color: CATEGORICAL[0],
              caption: `${usersByRole[role] || 0} account${usersByRole[role] === 1 ? '' : 's'}`,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Task Overview"
          subtitle={`${totalTasks} tasks · ${taskStatus.overdue} overdue`}
          icon={ListChecks}
          isEmpty={!totalTasks}
          emptyText="Tasks assigned by managers will be tracked here."
          action={<ViewAllButton to="/tasks" />}
        >
          <ProgressList
            items={[
              { label: 'Completed', value: taskStatus.completed, max: totalTasks, color: STATUS_COLORS.good, caption: `${taskStatus.completed} done` },
              { label: 'In Progress', value: taskStatus.inProgress, max: totalTasks, color: CATEGORICAL[0], caption: `${taskStatus.inProgress} active` },
              { label: 'Pending', value: taskStatus.pending, max: totalTasks, color: STATUS_COLORS.warning, caption: `${taskStatus.pending} not started` },
              { label: 'Overdue', value: taskStatus.overdue, max: totalTasks, color: STATUS_COLORS.critical, caption: `${taskStatus.overdue} past deadline` },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard
          title="Recently Added Employees"
          subtitle={`${stats.newHiresThisMonth} joined this month`}
          icon={Building2}
          isEmpty={!data.recentEmployees.length}
          emptyText="No employees have been added yet."
          action={<ViewAllButton to="/employees" />}
        >
          <div className="stack-sm">
            {data.recentEmployees.map((e) => (
              <ListRow
                key={e._id}
                leading={<Avatar name={`${e.firstName} ${e.lastName}`} size={36} />}
                title={`${e.firstName} ${e.lastName}`}
                meta={`${e.employeeId} · ${e.designation?.title || 'No designation'} · joined ${formatDate(e.joiningDate)}`}
                onClick={() => navigate(`/employees/${e._id}`)}
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Upcoming Deadlines"
          subtitle="Open tasks ordered by due date"
          icon={AlertTriangle}
          isEmpty={!data.upcomingTasks.length}
          emptyText="No open tasks with upcoming deadlines."
        >
          <div className="stack-sm">
            {data.upcomingTasks.map((task) => (
              <ListRow
                key={task._id}
                title={task.title}
                meta={`${task.assignedTo?.name || 'Unassigned'} · due ${formatShortDate(task.deadline)}`}
                status={isOverdue(task) ? 'overdue' : task.priority}
                onClick={() => navigate(`/tasks/${task._id}`)}
              />
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
