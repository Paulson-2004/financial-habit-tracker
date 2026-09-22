import Card from './Card.jsx';

/** Placeholder for a page whose real feature ships on a later day. Never wired to fake data. */
export default function ComingSoon({ title, plannedFor }) {
  return (
    <Card title={title}>
      <p className="text-sm text-slate-500">
        This page is a navigation placeholder. The full feature is planned for {plannedFor}.
      </p>
    </Card>
  );
}
