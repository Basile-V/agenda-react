import { useParams } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Button } from '../../ui/Button';

// ponytail: placeholder until phase 5 (header, navigation, grid)
export function DayPage() {
  const { date } = useParams();
  const { session, logout } = useAuth();
  const displayName = session.status === 'authenticated' ? session.user.displayName : '';

  return (
    <main>
      <title>{`${date ?? ''} · Agenda`}</title>
      <h1>{date}</h1>
      <p>{displayName}</p>
      <Button variant="ghost" onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </main>
  );
}
