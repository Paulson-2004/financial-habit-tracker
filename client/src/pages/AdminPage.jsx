import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import {
  useAdminFeedback,
  useAdminOverview,
  useAdminUsers,
  useSetUserActive,
  useUpdateAdminFeedback,
} from '../hooks/useAdmin.js';
import { FEEDBACK_TYPE_LABELS } from '../schemas/feedbackSchemas.js';
import {
  FEEDBACK_STATUS_LABELS,
  feedbackStatusLabel,
  feedbackStatusTone,
  userStatusLabel,
  userStatusTone,
} from '../utils/admin.js';
import { formatDate, formatMonthLabel } from '../utils/format.js';

const PAGE_SIZE = 10;
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'feedback', label: 'Feedback' },
];

const selectClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
const filterInputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

function TrendChart({ trends }) {
  if (!trends || trends.length === 0) {
    return <EmptyState title="No activity yet" description="Trends will appear once users join and transact." />;
  }
  return (
    <div className="h-64 w-full" role="img" aria-label="Bar chart of monthly platform activity">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={trends} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tickFormatter={(month) => month.slice(5)} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
          <Tooltip labelFormatter={(month) => formatMonthLabel(month)} />
          <Legend />
          <Bar dataKey="newUsers" name="New users" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="transactions" name="Transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="feedback" name="Feedback" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading, isError, refetch } = useAdminOverview();

  if (isLoading) return <Spinner label="Loading platform overview..." />;
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-red-600">Could not load platform overview. Please try again.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Users</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={data.users.total} sublabel={`${data.users.active} active`} />
          <StatCard label="New users (7 days)" value={data.users.newLast7Days} />
          <StatCard label="New users (30 days)" value={data.users.newLast30Days} />
          <StatCard label="Active admins" value={data.users.activeAdmins} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Platform usage</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Transactions" value={data.content.transactions} />
          <StatCard label="Habits" value={data.content.habits} sublabel={`${data.content.habitCompletions} completions`} />
          <StatCard label="Savings goals" value={data.content.savingsGoals} sublabel={`${data.content.goalContributions} contributions`} />
          <StatCard label="Assets / liabilities" value={`${data.content.assets} / ${data.content.liabilities}`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Feedback</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total submissions" value={data.feedback.total} />
          <StatCard label="Open" value={data.feedback.open} />
          <StatCard label="In review" value={data.feedback.inReview} />
          <StatCard label="Resolved" value={data.feedback.resolved} />
        </div>
      </section>

      <Card title="Monthly activity (last 6 months)">
        <TrendChart trends={data.monthlyTrends} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Recent users">
          {data.recentUsers.length === 0 ? (
            <EmptyState title="No users yet" description="New registrations will appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-900">
                    {user.name} <span className="font-normal text-slate-500">· {user.email}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(user.createdAt.slice(0, 10))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent feedback">
          {data.recentFeedback.length === 0 ? (
            <EmptyState title="No feedback yet" description="New submissions will appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentFeedback.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-900">{item.subject}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${feedbackStatusTone(item.status)}`}
                  >
                    {feedbackStatusLabel(item.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Pagination({ meta, page, onPageChange }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Page {meta.page} of {meta.totalPages} ({meta.total} total)
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const params = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(isActive ? { isActive } : {}),
  };
  const { data, isLoading, isError } = useAdminUsers(params);
  const setActive = useSetUserActive();

  function resetPage(fn) {
    return (value) => {
      fn(value);
      setPage(1);
    };
  }

  async function handleToggle(user) {
    const next = !user.isActive;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${user.name} (${user.email})?`)) return;
    try {
      await setActive.mutateAsync({ id: user.id, isActive: next });
      toast.success(next ? 'Account activated' : 'Account deactivated');
    } catch (error) {
      toast.error(error.message ?? 'Could not update account');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="user-search" className="text-sm font-medium text-slate-700">
              Search name or email
            </label>
            <input
              id="user-search"
              type="search"
              placeholder="e.g. ada@example.com"
              value={search}
              onChange={(event) => resetPage(setSearch)(event.target.value)}
              className={filterInputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="role-filter" className="text-sm font-medium text-slate-700">
              Role
            </label>
            <select id="role-filter" value={role} onChange={(event) => resetPage(setRole)(event.target.value)} className={selectClass}>
              <option value="">All</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select id="status-filter" value={isActive} onChange={(event) => resetPage(setIsActive)(event.target.value)} className={selectClass}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading && <Spinner label="Loading users..." />}
        {isError && <p className="text-sm text-red-600">Could not load users. Please try again.</p>}
        {!isLoading && !isError && data.data.length === 0 && (
          <EmptyState title="No users found" description="Try clearing your search or filters." />
        )}
        {!isLoading && !isError && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                    <th className="py-2 pl-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4 capitalize text-slate-600">{user.role}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${userStatusTone(user.isActive)}`}>
                          {userStatusLabel(user.isActive)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-600">{formatDate(user.createdAt.slice(0, 10))}</td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
                          disabled={setActive.isPending}
                          onClick={() => handleToggle(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

function FeedbackTab() {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const params = {
    page,
    pageSize: PAGE_SIZE,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search ? { search } : {}),
  };
  const { data, isLoading, isError } = useAdminFeedback(params);
  const updateFeedback = useUpdateAdminFeedback();

  const selected = data?.data.find((item) => item.id === selectedId) ?? null;

  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');

  function openDetail(item) {
    setSelectedId(item.id);
    setEditStatus(item.status);
    setEditNote(item.adminNote ?? '');
  }

  async function handleSave() {
    try {
      await updateFeedback.mutateAsync({
        id: selected.id,
        payload: { status: editStatus, adminNote: editNote.trim() === '' ? null : editNote.trim() },
      });
      toast.success('Feedback updated');
    } catch (error) {
      toast.error(error.message ?? 'Could not update feedback');
    }
  }

  function resetFilter(fn) {
    return (value) => {
      fn(value);
      setPage(1);
      setSelectedId(null);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="feedback-status-filter" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select id="feedback-status-filter" value={status} onChange={(event) => resetFilter(setStatus)(event.target.value)} className={selectClass}>
              <option value="">All</option>
              {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="feedback-type-filter" className="text-sm font-medium text-slate-700">
              Type
            </label>
            <select id="feedback-type-filter" value={type} onChange={(event) => resetFilter(setType)(event.target.value)} className={selectClass}>
              <option value="">All</option>
              {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="feedback-search" className="text-sm font-medium text-slate-700">
              Search subject or message
            </label>
            <input
              id="feedback-search"
              type="search"
              placeholder="e.g. dashboard"
              value={search}
              onChange={(event) => resetFilter(setSearch)(event.target.value)}
              className={filterInputClass}
            />
          </div>
        </div>
      </Card>

      <Card>
        {isLoading && <Spinner label="Loading feedback..." />}
        {isError && <p className="text-sm text-red-600">Could not load feedback. Please try again.</p>}
        {!isLoading && !isError && data.data.length === 0 && (
          <EmptyState title="No feedback found" description="Try clearing your filters, or check back later." />
        )}
        {!isLoading && !isError && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Subject</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Author</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openDetail(item)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === item.id ? 'bg-brand-50' : ''}`}
                    >
                      <td className="py-3 pr-4 font-medium text-slate-900">{item.subject}</td>
                      <td className="py-3 pr-4 text-slate-600">{FEEDBACK_TYPE_LABELS[item.type] ?? item.type}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.author.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${feedbackStatusTone(item.status)}`}>
                          {feedbackStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-600">{formatDate(item.createdAt.slice(0, 10))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </Card>

      {selected && (
        <Card title="Submission detail" action={<Button variant="secondary" onClick={() => setSelectedId(null)}>Close</Button>}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{selected.subject}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {selected.author.name} · {selected.author.email} · {formatDate(selected.createdAt.slice(0, 10))}
              </p>
            </div>
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{selected.message}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="feedback-edit-status" className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <select id="feedback-edit-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value)} className={selectClass}>
                  {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="feedback-edit-note" className="text-sm font-medium text-slate-700">
                Admin note (visible to admins only)
              </label>
              <textarea
                id="feedback-edit-note"
                rows={3}
                placeholder="Internal note about this submission..."
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                className={filterInputClass}
              />
            </div>
            <div>
              <Button onClick={handleSave} isLoading={updateFeedback.isPending}>
                Save changes
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-500">Platform usage, user accounts, and feedback triage.</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.key ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'feedback' && <FeedbackTab />}
    </div>
  );
}
