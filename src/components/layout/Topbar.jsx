import { Bell, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppSelector } from '../../hooks/reduxHooks';

function initials(user) {
  return (user?.fullName || user?.email || 'U').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const profile = useAppSelector((state) => state.user.profile);
  const syncedUser = { ...user, ...(profile || {}) };
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#dfe8e5] bg-[#f4f7f5]/95 px-7 backdrop-blur-xl max-[900px]:px-5">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-[#24494d]">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-[#dce7e4] bg-white text-[#567173] shadow-sm" aria-label="Notifications">
          <Bell size={16} strokeWidth={1.8} />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-[#dce7e4] bg-white py-1 pl-1 pr-2.5 shadow-sm">
            {syncedUser?.avatarUrl ? <img className="h-7 w-7 rounded-full object-cover" src={syncedUser.avatarUrl} alt="" /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-[#4f6f78] text-[10px] font-semibold text-white">{initials(syncedUser)}</span>}
            <span className="hidden text-left sm:block"><span className="block text-[11px] font-semibold text-[#173a3e]">{syncedUser?.fullName || 'Passenger'}</span><span className="block text-[9px] text-[#819394]">{syncedUser?.role || 'PASSENGER'}</span></span>
            <ChevronDown size={13} className="text-[#718687]" />
          </button>
          {open && <div className="absolute right-0 top-11 z-50 w-40 rounded-2xl border border-[#dce7e4] bg-white p-1.5 shadow-[0_18px_40px_rgba(20,57,59,.13)]">
            <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-[11px] text-[#2a5054] hover:bg-[#f3f7f5]" onClick={() => { setOpen(false); navigate('/profile'); }}>Profile</button>
            <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-[11px] text-[#2a5054] hover:bg-[#f3f7f5]" onClick={() => { setOpen(false); navigate('/settings'); }}>Settings</button>
            <button type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-[11px] text-[#b74444] hover:bg-[#fff3f1]" onClick={logout}>Logout</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
