import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BreakdownDonutChart from '../components/charts/BreakdownDonutChart.jsx';
import NetWorthChart from '../components/charts/NetWorthChart.jsx';

describe('NetWorthChart', () => {
  it('shows an empty state instead of a chart when there is no history yet', () => {
    render(<NetWorthChart history={[]} currency="INR" />);
    expect(screen.getByText('No net worth history yet')).toBeInTheDocument();
  });

  it('shows the same empty state when history is undefined (e.g. the query errored)', () => {
    render(<NetWorthChart history={undefined} currency="INR" />);
    expect(screen.getByText('No net worth history yet')).toBeInTheDocument();
  });

  it('renders a chart (not the empty state) once there is history', () => {
    render(
      <NetWorthChart
        history={[{ date: '2026-01-01', totalAssets: 1000, totalLiabilities: 0, netWorth: 1000 }]}
        currency="INR"
      />,
    );
    expect(screen.queryByText('No net worth history yet')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /net worth/i })).toBeInTheDocument();
  });
});

describe('BreakdownDonutChart', () => {
  const commonProps = { currency: 'INR', ariaLabel: 'Test chart', emptyTitle: 'Nothing here', emptyDescription: 'Add one' };

  it('shows the given empty state when there are no slices', () => {
    render(<BreakdownDonutChart slices={[]} {...commonProps} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add one')).toBeInTheDocument();
  });

  it('lists every slice with its amount and percent once there is data', () => {
    render(
      <BreakdownDonutChart
        slices={[{ key: 'stocks', name: 'Stocks', value: 5000, percent: 50 }]}
        {...commonProps}
      />,
    );
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});
