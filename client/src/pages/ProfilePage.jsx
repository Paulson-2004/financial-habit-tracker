import Card from '../components/ui/Card.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

// The editable profile form and the feedback form ship on Day 2; this shows real
// account data now so the page is not an empty placeholder.
export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <Card title="Profile">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">Name</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Email</dt>
          <dd className="text-sm font-medium text-slate-900">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Role</dt>
          <dd className="text-sm font-medium capitalize text-slate-900">{user?.role}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-slate-500">
        Editing your financial profile and submitting feedback are planned for Day 2.
      </p>
    </Card>
  );
}
