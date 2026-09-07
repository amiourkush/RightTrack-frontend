import { Bookmark, Home, LogOut, Search, Settings, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Logo from '../common/Logo';
import { useAuth } from '../../hooks/useAuth';

const items = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Find Train', to: '/find-train', icon: Search },
  { label: 'Saved', to: '/saved', icon: Bookmark },
];

const navClass = ({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-medium transition ${isActive ? 'bg-[#e8f2ef] text-[#0c716a] shadow-[inset_2px_0_0_#0c716a]' : 'text-[#667e80] hover:bg-white hover:text-[#234f53]'}`;

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[210px] flex-col justify-between border-r border-[#dce7e4] bg-[#f8faf9]/95 px-4 py-5 backdrop-blur-xl max-[900px]:hidden">
      <div>
        <div className="px-1"><Logo /></div>
        <nav className="mt-8 flex flex-col gap-1.5">
          {items.map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="space-y-1.5">
        <NavLink to="/profile" className={navClass}><UserRound size={16} strokeWidth={1.8} /><span>Profile</span></NavLink>
        <NavLink to="/settings" className={navClass}><Settings size={16} strokeWidth={1.8} /><span>Settings</span></NavLink>
        <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium text-[#667e80] transition hover:bg-white hover:text-[#b74444]" onClick={logout}>
          <LogOut size={16} strokeWidth={1.8} /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
