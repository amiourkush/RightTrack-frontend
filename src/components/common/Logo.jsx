import { TrainFront } from 'lucide-react';

export default function Logo({ compact = false }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2.5'}`}>
      <span className={`grid place-items-center rounded-[9px] bg-[#0b6f68] text-white shadow-[0_5px_14px_rgba(11,111,104,.18)] ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}>
        <TrainFront size={compact ? 16 : 18} strokeWidth={2.2} />
      </span>
      <span className={`font-semibold tracking-[-0.03em] text-[#17393d] ${compact ? 'text-[15px]' : 'text-[17px]'}`}>RightTrack</span>
    </div>
  );
}
