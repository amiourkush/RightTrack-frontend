import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

function title(path) {
  if (path === '/') return 'Home';
  if (path.startsWith('/find-train')) return 'Find Train';
  if (path.startsWith('/train/')) return 'Train Details';
  if (path === '/saved') return 'Saved';
  if (path.startsWith('/profile')) return 'Profile';
  if (path.startsWith('/settings')) return 'Settings';
  if (path.startsWith('/station')) return 'Station';
  if (path.startsWith('/access')) return 'Access Center';
  return 'RightTrack';
}

export default function DashboardLayout() {
  const { pathname } = useLocation();
  return (
    <div className="h-screen overflow-hidden bg-[#f4f7f5] text-[#15363a]">
      <Sidebar />
      <section className="ml-[210px] flex h-screen min-w-0 flex-col max-[900px]:ml-0">
        <Topbar title={title(pathname)} />
        <main className="min-h-0 flex-1 overflow-hidden px-7 pb-3 pt-1 max-[1100px]:px-5 max-[900px]:overflow-auto max-[640px]:px-4">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
