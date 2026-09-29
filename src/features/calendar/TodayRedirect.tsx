import { Navigate } from 'react-router';
import { toDateKey } from './time';

// A component, not a constant route: "today" must be computed at navigation time.
export function TodayRedirect() {
  return <Navigate to={`/${toDateKey(new Date())}`} replace />;
}
