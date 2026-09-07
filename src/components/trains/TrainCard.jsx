import { ArrowRight, Bookmark, Gauge, MapPin, Route as RouteIcon, TimerReset } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedTrains } from '../../hooks/useSavedTrains';
import { addRecentSearch } from '../../hooks/useRecentSearches';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { hydrateTrainSummary } from '../../features/trains/trainSlice';
import {
  formatTimeOnly,
  getDelayMinutes,
  getDistanceCovered,
  getLiveSequence,
  getLiveSpeed,
  getMergedRouteStops,
  getNextMainStation,
  getNextMainStationDelay,
  getStationEtaPredictions,
  getTrainDelayInfo,
  isMainHalt,
  normalizeLive,
} from '../../utils/train';

function phase(live) {
  const v = String(normalizeLive(live || {}).status || '').toUpperCase();
  if (!v) return 'unknown';
  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(v)) return 'not-started';
  if (/CANCEL/.test(v)) return 'cancelled';
  if (/COMPLET|TERMINAT/.test(v)) return 'completed';
  return /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(v) ? 'running' : 'unknown';
}



export default function TrainCard({ train, variant = 'live' }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSaved, toggleSaved } = useSavedTrains();
  const bundle = useAppSelector((s) => s.trains.byNumber[String(train.number)]) || {};
  const settings = useAppSelector((s) => s.user.settings);
  const timeFormat = settings?.timeFormat || 'H24';
  // Merge: search result → bundle.details (when loaded)
  const data = { ...train, ...(bundle.details || {}) };
  // Unified name with broad fallback chain
  const trainName = data.trainName ?? data.name ?? train.trainName ?? train.name ?? `Train ${train.number}`;
  const sourceName = data.sourceStationName ?? data.sourceName ?? train.sourceStationName ?? train.sourceName ?? '';
  const destName   = data.destinationStationName ?? data.destinationName ?? train.destinationStationName ?? train.destinationName ?? '';
  const summary = variant === 'summary';

  useEffect(() => {
    if (!summary && !bundle.live && !bundle.loading && train.number) {
      dispatch(hydrateTrainSummary({ trainNumber: train.number }));
    }
  }, [dispatch, summary, bundle.live, bundle.loading, train.number]);

  const trainBundle = { ...bundle, details: data, route: bundle.route, live: bundle.live };
  const stops = getMergedRouteStops(trainBundle);
  const live = normalizeLive(bundle.live || {});
  const p = phase(live);
  const running = p === 'running';
  const sequence = running ? getLiveSequence(trainBundle) : 0;
  const currentCode = live.currentStationCode || '';
  const current = stops.find((s) => String(s.stationCode || s.code).toUpperCase() === String(currentCode).toUpperCase());
  const main = getNextMainStation(trainBundle);
  const nextMainDelay = getNextMainStationDelay(trainBundle);

  const etaPred = main ? getStationEtaPredictions(trainBundle, main) : null;
  const nextEta = etaPred?.arrivalEta || null;
  const nextEtaTone = etaPred?.arrivalTone || 'unknown';

  const delayInfo = nextMainDelay;
  const speed = getLiveSpeed(trainBundle);
  const covered = getDistanceCovered(trainBundle);
  const total = Number(data.distanceKm ?? stops.at(-1)?.distanceKm ?? 1);
  const progressPercent = total > 0 && covered != null
    ? Math.min(100, Math.max(0, (covered / total) * 100))
    : p === 'completed' ? 100 : 0;

  const open = () => {
    addRecentSearch(data);
    navigate(`/train/${train.number}`);
  };

  const save = (e) => {
    e.stopPropagation();
    toggleSaved(data);
  };

  // For summary card (recent searches & saved trains), strictly show only train number, name, start and end destination
  if (summary) {
    const stopsList = Array.isArray(data.routeStops) ? data.routeStops : [];
    const source = data.sourceStationName || data.sourceName || train.sourceStationName || train.sourceName || stopsList[0]?.stationName || data.sourceCode || train.sourceCode || 'Origin';
    const dest = data.destinationStationName || data.destinationName || train.destinationStationName || train.destinationName || stopsList.at(-1)?.stationName || data.destinationCode || train.destinationCode || 'Destination';

    return (
      <article
        onClick={open}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-[#dce7e4] bg-white px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-[#b6d6ce] hover:shadow-[0_12px_24px_rgba(20,55,56,.07)]"
      >
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 min-w-11 place-items-center rounded-xl bg-[#edf5f3] font-mono-ui text-[12px] font-bold text-[#0c716a]">
            {train.number}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold text-[#183c40]">
              {trainName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#657e80]">
              <span className="font-medium text-[#2f5558]">{sourceName || 'Origin'}</span>
              <ArrowRight size={12} className="text-[#99abab]" />
              <span className="font-medium text-[#2f5558]">{destName || 'Destination'}</span>
            </p>
          </div>
          <ArrowRight size={15} className="text-[#a4b5b5] transition-transform group-hover:translate-x-1 group-hover:text-[#0c716a]" />
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={open}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[#dce7e4] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(22,57,58,.08)]"
    >
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        <div className={`grid h-10 min-w-11 place-items-center rounded-xl text-[11px] font-semibold ${running ? 'bg-[#e8f6f1] text-[#0c7169]' : 'bg-[#eef4fa] text-[#245d96]'}`}>
          {train.number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[13px] font-semibold text-[#183c40]">{trainName}</h3>
            {!summary && (data.category || data.trainType || train.type) && (
              <span className="rounded-full bg-[#f0f5fb] px-2 py-1 text-[9px] font-medium text-[#41688e]">
                {data.category || data.trainType || train.type}
              </span>
            )}
          </div>
          {!summary && (
            <p className="mt-1 text-[11px] text-[#667d7f]">
              {sourceName || 'Origin'} <span className="px-1">→</span> {destName || 'Destination'}
            </p>
          )}
        </div>
        {!summary && (
          <div className="train-card-next-eta">
            <span>Next ETA</span>
            <strong className={!nextEta ? 'is-muted' : nextEtaTone === 'late' ? 'is-late' : 'is-good'}>
              {nextEta ? formatTimeOnly(nextEta, timeFormat) : '—'}
            </strong>
            <small>{main?.stationName || 'Next station'}</small>
          </div>
        )}
        {!summary && (
          <button onClick={save} className="grid h-8 w-8 place-items-center rounded-full text-[#7a8e90]" aria-label="Save train">
            <Bookmark size={15} fill={isSaved(train.number) ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="border-t border-[#edf2f0] bg-[#fbfdfc] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex min-w-0 items-center gap-2 text-[10px] text-[#718687]">
              <MapPin size={12} />
              <span className="truncate">
                {live.currentStationName || current?.stationName || currentCode || (running ? 'Live journey' : p === 'not-started' ? 'Not started' : 'Scheduled journey')}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${running ? 'bg-[#e8f7f0] text-[#108467]' : p === 'cancelled' ? 'bg-[#fff0ef] text-[#c94a4a]' : 'bg-[#f0f4f4] text-[#728585]'}`}>
              {running ? 'LIVE' : p.replace('-', ' ').toUpperCase()}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-xl border border-[#e1ece9] bg-white px-3 py-2.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#7d918f]">
                <TimerReset size={11} className="mr-1 inline" />Next station ETA
              </div>
              <div className={`mt-1 font-mono-ui text-[25px] font-bold leading-none ${!nextEta ? 'text-[#899998]' : nextEtaTone === 'late' ? 'text-[#d94e4e]' : 'text-[#0a8b68]'}`}>
                {nextEta ? formatTimeOnly(nextEta, timeFormat) : '—'}
              </div>
              <div className="mt-1 text-[9px] text-[#728688]">{main?.stationName || 'Awaiting next main station'}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-right">
              <span
                className={`train-card-current-delay ${delayInfo.tone === 'late' ? 'late' : delayInfo.tone === 'early' ? 'early' : 'on-time'}`}
                title={delayInfo.stationName ? `Delay at next main station: ${delayInfo.stationName}` : undefined}
              >
                {delayInfo.label}
              </span>
              {delayInfo.stationName && (
                <span className="text-[8.5px] text-[#718687] font-medium leading-none">
                  At {delayInfo.stationName}
                </span>
              )}
              {speed != null && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#718687]">
                  <Gauge size={11} /> {Math.round(Number(speed))} km/h
                </span>
              )}
              {covered != null && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#718687]">
                  <RouteIcon size={11} /> {Math.round(Number(covered))} km covered
                </span>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="train-progress-track">
              <span className="train-progress-base" />
              <span className="train-progress-fill" style={{ width: `${progressPercent}%` }} />
              <span className="train-progress-point start" />
              {running && progressPercent > 0 && progressPercent < 100 && (
                <span
                  className="train-progress-point current"
                  style={{
                    left: `${progressPercent}%`,
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#0d716a',
                    boxShadow: '0 0 0 3px rgba(13,113,106,.25)',
                  }}
                />
              )}
              <span className="train-progress-point end" />
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-[#718687]">
              <span>{sourceName || 'Origin'}</span>
              <span className="font-mono-ui text-[8.5px] text-[#8e9f9e]">
                {covered != null ? `${Math.round(covered)} / ${total} km` : ''}
              </span>
              <span>{destName || 'Destination'}</span>
            </div>
          </div>
        </div>
      </article>
  );
}

