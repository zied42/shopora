import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <p className="text-lg font-semibold text-slate-800">Page not found</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}