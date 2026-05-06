import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-brand-primary">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
