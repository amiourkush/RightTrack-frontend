import { ArrowRight, Clock3, MapPin, RefreshCw, Search, ShieldCheck, TrainFront, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import SearchBox from '../components/trains/SearchBox';
import TrainCard from '../components/trains/TrainCard';
import { useSavedTrains } from '../hooks/useSavedTrains';
import { useRecentSearches, addRecentSearch } from '../hooks/useRecentSearches';
import { searchTrains, setSearchQuery } from '../features/trains/trainSlice';
import { selectSearch, selectSearchLoading } from '../features/trains/trainSelectors';

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { recent } = useRecentSearches();
  const { saved } = useSavedTrains();
  const [activeQuery, setActiveQuery] = useState('');

  const searchResults = useAppSelector(selectSearch);
  const searchLoading = useAppSelector(selectSearchLoading);

  const displayName = user?.fullName?.split(' ')[0] || 'there';

  const handleSearchResult = (q) => {
    const trimmed = (q || '').trim();
    setActiveQuery(trimmed);
    if (trimmed) {
      dispatch(setSearchQuery(trimmed));
      dispatch(searchTrains(trimmed));
    }
  };

  const handleQuickPick = (trainNumber) => {
    navigate(`/train/${trainNumber}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <section className="flex shrink-0 items-end justify-between gap-6 px-1 pt-2">
        <div>
          <div className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-[#91a0a0]">Good evening</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-.035em] text-[#15383d]">{displayName} <span className="text-[22px]">👋</span></h1>
          <p className="mt-1 text-[12px] text-[#688082]">Where do you want to go today?</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#dce7e4] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(24,61,61,.045)]">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e8f5f1] text-[#0d716a]"><TrainFront size={16}/></span>
          <div><div className="text-[14px] font-semibold text-[#24484c]">{saved.length}</div><div className="text-[9px] uppercase tracking-[.08em] text-[#8a9a9a]">saved trains</div></div>
        </div>
      </section>

      <section className="shrink-0 rounded-[20px] border border-[#dce7e4] bg-white p-3 shadow-[0_12px_28px_rgba(24,61,61,.045)]">
        <SearchBox
          initialValue={activeQuery}
          placeholder="Enter 5-digit train number (e.g. 12314, 15119)…"
          onResult={handleSearchResult}
          onSelectTrain={(train) => {
            addRecentSearch(train);
            navigate(`/train/${train.number}`);
          }}
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1">
          <span className="text-[9px] font-semibold uppercase tracking-[.1em] text-[#8e9f9f]">Quick numbers:</span>
          {['15119', '12919', '12951', '12010'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleQuickPick(item)}
              className={`rounded-full border px-3 py-1 text-[9px] font-medium transition ${activeQuery === item ? 'border-[#0c716a] bg-[#eaf5f2] text-[#0c716a]' : 'border-[#e0e9e6] bg-[#f9fbfa] text-[#6b7f81] hover:border-[#b8d2cc] hover:text-[#0d716a]'}`}
            >
              {item}
            </button>
          ))}
          <button type="button" onClick={() => navigate('/find-train')} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-medium text-[#0d716a] hover:bg-[#eef6f3]">Advanced search <ArrowRight size={12}/></button>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden">
        {activeQuery ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-2 flex items-end justify-between px-1">
              <div>
                <h2 className="text-[14px] font-semibold text-[#24494d]">
                  Search results for &ldquo;{activeQuery}&rdquo;
                </h2>
                <p className="mt-0.5 text-[9px] text-[#8a999a]">
                  {searchLoading
                    ? 'Connecting to RailAI service…'
                    : searchResults.length
                    ? `Found ${searchResults.length} matching service${searchResults.length > 1 ? 's' : ''}`
                    : 'No matching services found'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveQuery('');
                  dispatch(setSearchQuery(''));
                }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7d8f90] hover:text-[#0d716a]"
              >
                <X size={12} /> Clear search
              </button>
            </div>

            <div className="grid min-h-0 gap-2.5 overflow-y-auto pb-3 pr-1 no-scrollbar">
              {searchLoading ? (
                <div className="flex h-44 items-center justify-center gap-2 rounded-2xl border border-[#dce7e4] bg-white text-[11px] text-[#6b8284]">
                  <RefreshCw size={14} className="animate-spin text-[#0d716a]" />
                  <span>Searching train telemetry…</span>
                </div>
              ) : searchResults.length ? (
                searchResults.map((train) => (
                  <TrainCard key={train.number} train={train} />
                ))
              ) : (
                <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-[#dce7e4] bg-white/60 p-6 text-center text-[#6e8384]">
                  <div>
                    <Search size={22} className="mx-auto text-[#94a6a7]" />
                    <p className="mt-2 text-[12px] font-medium text-[#25494d]">No train found matching &ldquo;{activeQuery}&rdquo;</p>
                    <p className="mt-1 text-[10px] text-[#87999a]">Please check the 5-digit train number or try another query.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-2 flex items-end justify-between px-1">
              <div>
                <h2 className="text-[14px] font-semibold text-[#24494d]">Your recent searches</h2>
                <p className="mt-0.5 text-[9px] text-[#8a999a]">Jump back into a journey</p>
              </div>
              <button type="button" onClick={() => navigate('/find-train')} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0d716a]">
                View all <ArrowRight size={13}/>
              </button>
            </div>
            {recent.length ? (
              <div className="grid min-h-0 gap-2 overflow-y-auto pb-2 pr-1 no-scrollbar">
                {recent.slice(0, 4).map((train) => (
                  <TrainCard key={train.number} train={train} variant="summary"/>
                ))}
              </div>
            ) : (
              <div className="grid h-full min-h-[220px] place-items-center rounded-[20px] border border-dashed border-[#d8e5e1] bg-white/70 p-10 text-center">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf5f2] text-[#0d716a]"><MapPin size={21}/></div>
                  <h3 className="mt-3 text-[14px] font-semibold text-[#244b4f]">Track a train in seconds</h3>
                  <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-[#7a8e8f]">Enter a 5-digit train number above to see live movement, intermediate stations and ETA.</p>
                  <button type="button" onClick={() => navigate('/find-train')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0d716a] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_7px_15px_rgba(13,113,106,.18)]"><Search size={14}/> Find a train</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid shrink-0 grid-cols-3 gap-2.5 max-[800px]:grid-cols-1">
        {[{icon:Clock3,title:'Live updates',text:'Telemetry refreshes automatically.'},{icon:ShieldCheck,title:'Clear ETAs',text:'Compare scheduled and predicted times.'},{icon:TrainFront,title:'One journey view',text:'Route, map and station context together.'}].map(({icon:Icon,title,text}) => <div key={title} className="flex items-center gap-2.5 rounded-2xl border border-[#dce7e4] bg-white px-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0f5f3] text-[#0d716a]"><Icon size={15}/></span><div><div className="text-[10px] font-semibold text-[#36575b]">{title}</div><div className="mt-0.5 text-[9px] text-[#819294]">{text}</div></div></div>)}
      </section>
    </div>
  );
}
