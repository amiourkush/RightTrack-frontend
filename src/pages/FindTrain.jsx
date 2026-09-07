import { ArrowRight, CalendarDays, MapPinned, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBox from '../components/trains/SearchBox';
import TrainCard from '../components/trains/TrainCard';
import EmptyState from '../components/common/EmptyState';
import { canSearchTrainQuery, getLocalISODate } from '../utils/train';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { fetchTrainsBetween, hydrateTrainSummary, searchTrains, setSearchQuery } from '../features/trains/trainSlice';
import { selectSearch, selectSearchError, selectSearchLoading } from '../features/trains/trainSelectors';

const filters = ['All', 'Express', 'Superfast', 'Mail/Express', 'Passenger'];

export default function FindTrain() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const results = useAppSelector(selectSearch);
  const loading = useAppSelector(selectSearchLoading);
  const error = useAppSelector(selectSearchError);
  const searchQuery = useAppSelector((state) => state.trains.searchQuery);
  const [filter, setFilter] = useState('All');
  const [showBetween, setShowBetween] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [journeyDate, setJourneyDate] = useState(getLocalISODate());

  useEffect(() => {
    const q = params.get('q');
    if (q && /^\d{5}$/.test(q)) {
      navigate(`/train/${q}`, { replace: true });
      return;
    }
    if (q && q !== searchQuery && canSearchTrainQuery(q)) {
      dispatch(setSearchQuery(q));
      dispatch(searchTrains(q));
    }
  }, [dispatch, params, searchQuery, navigate]);

  useEffect(() => {
    if (results.length) {
      results.slice(0, 10).forEach((train) => {
        dispatch(hydrateTrainSummary({ trainNumber: train.number, journeyDate }));
      });
    }
  }, [dispatch, results, journeyDate]);

  const visible = useMemo(() => results.filter((train) => filter === 'All' || String(train.type || '').toLowerCase().includes(filter.toLowerCase())), [results, filter]);
  const between = useAppSelector((state) => state.trains.between);
  const runBetween = async (event) => { event.preventDefault(); if (!from || !to) return; await dispatch(fetchTrainsBetween({ from: from.toUpperCase(), to: to.toUpperCase(), journeyDate })); };

  const searchFromPage = useCallback((query) => { const q = query?.trim(); if (!canSearchTrainQuery(q)) return; setParams({ q }); }, [setParams]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex shrink-0 items-end justify-between gap-5 px-1">
        <div><div className="font-mono-ui text-[9px] uppercase tracking-[.15em] text-[#91a0a0]">Find your next journey</div><h1 className="mt-1 text-[27px] font-semibold tracking-[-.035em] text-[#15383d]">Find Train</h1><p className="mt-1 text-[12px] text-[#6c8183]">Search by train number or name, then open the live route.</p></div>
        <button type="button" onClick={() => setShowBetween((v) => !v)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-semibold ${showBetween ? 'border-[#9ccbc2] bg-[#e9f5f2] text-[#0d716a]' : 'border-[#dce7e4] bg-white text-[#4f6e70]'}`}><MapPinned size={14}/> Between stations</button>
      </section>

      <section className="shrink-0 rounded-[20px] border border-[#dce7e4] bg-white p-3 shadow-[0_10px_25px_rgba(24,61,61,.045)]">
        <SearchBox
          initialValue={params.get('q') || ''}
          onResult={searchFromPage}
          onSelectTrain={(train) => navigate(`/train/${train.number}`)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><SlidersHorizontal size={13} className="mr-1 text-[#8a9a9a]" />{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1.5 text-[9px] font-medium ${filter === item ? 'border-[#0d716a] bg-[#0d716a] text-white' : 'border-[#e0e9e6] bg-[#fafcfb] text-[#6f8283] hover:text-[#0d716a]'}`}>{item}</button>)}</div>
      </section>

      {showBetween && <form className="grid shrink-0 grid-cols-[1fr_1fr_1fr_auto] gap-2.5 rounded-[20px] border border-[#dce7e4] bg-white p-3 shadow-[0_8px_20px_rgba(24,61,61,.035)] max-[800px]:grid-cols-1" onSubmit={runBetween}>
        <label className="text-[9px] font-medium uppercase tracking-[.12em] text-[#829192]">From<input className="mt-1.5 h-10 w-full rounded-xl border border-[#dce7e4] bg-[#fbfcfc] px-3 text-[11px] text-[#24484c] outline-none focus:border-[#9ccbc2]" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="NDLS" maxLength={6}/></label>
        <label className="text-[9px] font-medium uppercase tracking-[.12em] text-[#829192]">To<input className="mt-1.5 h-10 w-full rounded-xl border border-[#dce7e4] bg-[#fbfcfc] px-3 text-[11px] text-[#24484c] outline-none focus:border-[#9ccbc2]" value={to} onChange={(e) => setTo(e.target.value)} placeholder="SDAH" maxLength={6}/></label>
        <label className="text-[9px] font-medium uppercase tracking-[.12em] text-[#829192]">Journey date<div className="relative mt-1.5"><CalendarDays size={13} className="pointer-events-none absolute left-3 top-3.5 text-[#7d8d8e]"/><input type="date" className="h-10 w-full rounded-xl border border-[#dce7e4] bg-[#fbfcfc] pl-9 pr-3 text-[11px] text-[#24484c] outline-none focus:border-[#9ccbc2]" value={journeyDate} onChange={(e) => setJourneyDate(e.target.value)}/></div></label>
        <button type="submit" disabled={!from || !to} className="self-end inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0d716a] px-4 text-[10px] font-semibold text-white shadow-[0_6px_14px_rgba(13,113,106,.16)] disabled:opacity-50"><Search size={13}/> Find</button>
      </form>}

      <section className="min-h-0 flex-1 overflow-hidden">
        <div className="mb-2 flex items-end justify-between px-1"><div><h2 className="text-[14px] font-semibold text-[#24494d]">{visible.length} results found</h2><p className="mt-0.5 text-[9px] text-[#88999a]">{loading ? 'Searching RailAI…' : typeof error === 'string' ? error : 'Live results from the RailAI service'}</p></div>{!loading && <span className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-[#9aa7a7]">Backend search</span>}</div>
        <div className="h-full overflow-y-auto pr-1 pb-3 no-scrollbar">{loading ? <div className="flex h-full min-h-[220px] items-center justify-center text-[11px] text-[#7d8e8f]">Searching RailAI…</div> : visible.length ? <div className="grid gap-2.5">{visible.map((train) => <TrainCard key={train.number} train={train}/>)}</div> : <EmptyState icon={<Search size={21} strokeWidth={1.8} />} title="No trains found" description="Try a complete train number or a part of the train name." />}</div>
      </section>

      {between.length > 0 && <section className="shrink-0"><div className="mb-2 flex items-end justify-between px-1"><div><h2 className="text-[13px] font-semibold text-[#24494d]">Trains between {from.toUpperCase()} and {to.toUpperCase()}</h2><p className="mt-0.5 text-[9px] text-[#88999a]">{between.length} matching services</p></div><ArrowRight size={14} className="text-[#8ea0a1]"/></div><div className="grid gap-2">{between.slice(0,3).map((train) => <TrainCard key={train.number} train={train}/>)}</div></section>}
    </div>
  );
}
