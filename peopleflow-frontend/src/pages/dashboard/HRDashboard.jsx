import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, CalendarDays, Clock, PieChart as PieIcon, BarChart3, TrendingUp, CheckCircle2, XCircle, ListChecks, Timer,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Input';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { ProgressList } from '../../components/charts/ProgressList';
import { CATEGORICAL, STATUS_COLORS, withCategoricalColors } from '../../components/charts/palette';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { dashboardApi, leavesApi } from '../../api/endpoints';
import { LEAVE_TYPE_LABELS, ROLES } from '../../utils/constants';
import { formatDateRange, formatShortDate, isOverdue } from '../../utils/format';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { ChartCard, DashboardError, DashboardSkeleton, ListRow, ViewAllButton, sum } from './DashboardWidgets';

export function HRDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const [review, setReview] = useState(null); // { leave, decision: 'approve' | 'reject' }
  const [note, setNote] = useState('');
  const isHR = user?.role === ROLES.HR;

  const { data, loading, error, reload } = useFetch((config) => dashboardApi.get(undefined, config), [version]);

  const [submitReview, reviewing] = useAction(
    ({ leave, decision }) => (decision === 'approve' ? leavesApi.approve(leave._id, note) : leavesApi.reject(leave._id, note)),
    {
      success: (res) => res.data.message,
      onSuccess: () => {
        setReview(null);
        setNote('');
        reload();
      },
    },
  );

  const header = (
    <PageHeader
      title={isHR ? 'HR Dashboard' : 'Manager Dashboard'}
      subtitle="Workforce headcount, attendance health and pending approvals"
    >
      <Button variant="secondary" icon={Timer} onClick={() => navigate('/attendance/my')}>
        My Attendance
      </Button>
      {isHR ? (
        <Button icon={UserPlus} onClick={() => navigate('/employees/add')}>Add Employee</Button>
      ) : (
        <Button icon={ListChecks} onClick={() => navigate('/tasks/create')}>Assign Task</Button>
      )}
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

  const { stats, leaveTrend, hiringTrend, taskStatus } = data;
  const totalTasks = taskStatus.pending + taskStatus.inProgress + taskStatus.completed;

  return (
    <div>
      {header}

      <div className="stats-grid">
        <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} subtext={`Across ${stats.departments} departments`} />
        <StatCard label="Present Today" value={stats.presentToday} icon={Clock} subtext={`${stats.attendanceRate}% · ${stats.lateToday} late`} />
        <StatCard label="Pending Approvals" value={stats.pendingLeaves} icon={CalendarDays} subtext="Leave requests awaiting action" />
        <StatCard label="New Hires" value={stats.newHiresThisMonth} icon={UserPlus} subtext="Joined this month" />
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
          <DonutChart data={withCategoricalColors(data.departmentDistribution)} centerValue={stats.totalEmployees} centerLabel="Employees" />
        </ChartCard>
      </div>

      <div className="grid-2 section-gap">
        <ChartCard
          title="Leave Requests by Month"
          subtitle="Approved, pending and rejected volume"
          icon={BarChart3}
          isEmpty={!sum(leaveTrend.approved) && !sum(leaveTrend.pending) && !sum(leaveTrend.rejected)}
          emptyText="No leave requests in the last six months."
        >
          <BarChart
            labels={leaveTrend.labels}
            series={[
              { name: 'Approved', color: STATUS_COLORS.good, values: leaveTrend.approved },
              { name: 'Pending', color: STATUS_COLORS.warning, values: leaveTrend.pending },
              { name: 'Rejected', color: STATUS_COLORS.critical, values: leaveTrend.rejected },
            ]}
            height={240}
            stacked
          />
        </ChartCard>

        <ChartCard
          title="New Hires"
          subtitle="Employees joining over the last six months"
          icon={TrendingUp}
          isEmpty={!sum(hiringTrend.hires)}
          emptyText="No new joiners in the last six months."
        >
          <BarChart labels={hiringTrend.labels} series={[{ name: 'New hires', color: CATEGORICAL[0], values: hiringTrend.hires }]} height={240} />
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard
          title="Pending Leave Approvals"
          subtitle="Requests waiting on your action"
          icon={CalendarDays}
          isEmpty={!data.pendingLeaves.length}
          emptyText="You're all caught up — no pending requests."
          action={<ViewAllButton to="/leaves" />}
        >
          <div className="stack-sm">
            {data.pendingLeaves.map((leave) => {
              const own = leave.user?._id === user?._id;
              return (
                <ListRow
                  key={leave._id}
                  leading={<Avatar name={leave.user?.name} src={leave.user?.avatar?.url} size={36} />}
                  title={leave.user?.name}
                  meta={`${LEAVE_TYPE_LABELS[leave.leaveType]} · ${formatDateRange(leave.startDate, leave.endDate)} · ${leave.days}d`}
                  onClick={() => navigate(`/leaves/${leave._id}`)}
                  actions={own ? <span className="text-xs text-muted">Your request</span> : (
                    <>
                      <Button variant="ghost" size="sm" className="btn-icon text-success" icon={CheckCircle2} aria-label={`Approve leave for ${leave.user?.name}`} onClick={() => setReview({ leave, decision: 'approve' })} />
                      <Button variant="ghost" size="sm" className="btn-icon text-danger" icon={XCircle} aria-label={`Reject leave for ${leave.user?.name}`} onClick={() => setReview({ leave, decision: 'reject' })} />
                    </>
                  )}
                />
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Task Overview"
          subtitle={`${totalTasks} tasks · ${taskStatus.overdue} overdue`}
          icon={ListChecks}
          isEmpty={!totalTasks}
          emptyText="No tasks have been assigned yet."
          action={<ViewAllButton to="/tasks" />}
        >
          <ProgressList
            items={[
              { label: 'Completed', value: taskStatus.completed, max: totalTasks, color: STATUS_COLORS.good, caption: `${taskStatus.completed} done` },
              { label: 'In Progress', value: taskStatus.inProgress, max: totalTasks, color: CATEGORICAL[0], caption: `${taskStatus.inProgress} active` },
              { label: 'Pending', value: taskStatus.pending, max: totalTasks, color: STATUS_COLORS.warning, caption: `${taskStatus.pending} not started` },
            ]}
          />
          {data.upcomingTasks.length > 0 && (
            <div className="stack-sm" style={{ marginTop: '1.25rem' }}>
              <span className="text-xs text-bold text-muted">NEXT DEADLINES</span>
              {data.upcomingTasks.slice(0, 3).map((task) => (
                <ListRow
                  key={task._id}
                  title={task.title}
                  meta={`${task.assignedTo?.name || 'Unassigned'} · due ${formatShortDate(task.deadline)}`}
                  status={isOverdue(task) ? 'overdue' : task.priority}
                  onClick={() => navigate(`/tasks/${task._id}`)}
                />
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <Modal
        isOpen={Boolean(review)}
        onClose={() => setReview(null)}
        title={review?.decision === 'approve' ? 'Approve leave' : 'Reject leave'}
        confirmLabel={review?.decision === 'approve' ? 'Approve' : 'Reject'}
        variant={review?.decision === 'approve' ? 'primary' : 'danger'}
        confirmLoading={reviewing}
        onConfirm={() => submitReview(review)}
      >
        {review && (
          <>
            <p style={{ marginBottom: '1rem' }}>
              {review.leave.user?.name} · {LEAVE_TYPE_LABELS[review.leave.leaveType]} ·{' '}
              {formatDateRange(review.leave.startDate, review.leave.endDate)} ({review.leave.days} day{review.leave.days === 1 ? '' : 's'})
            </p>
            <Textarea
              label="Note (optional)"
              rows={3}
              maxLength={500}
              placeholder={review.decision === 'reject' ? 'Share a reason with the employee' : 'Add a note for the employee'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
