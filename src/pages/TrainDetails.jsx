import { ArrowLeft, Bookmark, Clock, Gauge, RefreshCw, Route, Timer } from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import { useAppDispatch,useAppSelector } from '../hooks/reduxHooks';
import { requestTrainRefresh } from '../features/trains/trainSlice';
import { useTrain } from '../hooks/useTrain';
import RouteTimeline from '../components/trains/RouteTimeline';
import TrainMap from '../components/map/TrainMap';
import { useSavedTrains } from '../hooks/useSavedTrains';
import { getStationEta } from '../services/api/trainApi';
import {
  formatTimeOnly,
  getDistanceCovered,
  getLiveSpeed,
  getMergedRouteStops,
  getNextMainStation,
  getNextMainStationDelay,
  getStationEtaPredictions,
  getTotalDistance,
  getTrainDelayInfo,
  isMainHalt,
  normalizeLive,
  stationCode,
  stationName,
} from '../utils/train';

export default function TrainDetails() {
  const { trainNumber } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.user.settings);
  const { train } = useTrain(trainNumber, undefined, { intervalSeconds: Number(settings?.autoRefreshIntervalSeconds) || 30 });
  const { isSaved, toggleSaved } = useSavedTrains();
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stationEtas, setStationEtas] = useState({});
  const [focusedStation, setFocusedStation] = useState(null);
  const timeFormat = settings?.timeFormat || 'H24';

  const details = train?.details || {};
  const live = normalizeLive(train?.live || {});
  const location = normalizeLive(train?.location || {});
  const stops = useMemo(() => getMergedRouteStops(train), [train]);

  // On-demand fetch of station ETA only if user focuses on a specific station not already present
  useEffect(() => {
    if (!trainNumber || !focusedStation) return;
    const code = stationCode(focusedStation);
    if (!code || (train?.stationEtas && train.stationEtas[code.toUpperCase()])) return;

    let active = true;
    getStationEta(trainNumber, code, live.journeyDate)
      .then((res) => {
        if (active && res?.data) {
          setStationEtas((prev) => ({ ...prev, [code.toUpperCase()]: res.data }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [trainNumber, focusedStation, train?.stationEtas, live.journeyDate]);

  const allStationEtas = useMemo(() => ({ ...(train?.stationEtas || {}), ...stationEtas }), [train?.stationEtas, stationEtas]);
  const trainWithEtas = useMemo(() => ({ ...train, stationEtas: allStationEtas }), [train, allStationEtas]);

  const speed = getLiveSpeed(trainWithEtas);
  const total = getTotalDistance(trainWithEtas) || Number(details.distanceKm ?? stops.at(-1)?.distanceKm ?? 0);
  const covered = getDistanceCovered(trainWithEtas);
  const nextMainStation = getNextMainStation(trainWithEtas);
  const nextMainDelay = getNextMainStationDelay(trainWithEtas);
  const last = live.lastUpdatedAt || location.lastUpdatedAt;

  // Active Delay displayed at the top: changes as next station changes, or reflects user-focused station
  const currentTopDelay = useMemo(() => {
    if (focusedStation) {
      const pred = getStationEtaPredictions(trainWithEtas, focusedStation);
      return {
        minutes: pred.delayMinutes,
        label: pred.delayLabel,
        tone: pred.arrivalTone !== 'unknown' ? pred.arrivalTone : pred.generalTone,
        stationName: stationName(focusedStation),
        stationCode: stationCode(focusedStation),
        etaTime: pred.arrivalEta || pred.departureEta,
        isFocused: true,
      };
    }
    return {
      ...nextMainDelay,
      etaTime: nextMainStation ? getStationEtaPredictions(trainWithEtas, nextMainStation)?.arrivalEta : null,
      isFocused: false,
    };
  }, [focusedStation, nextMainDelay, nextMainStation, trainWithEtas]);

  const trainName = details.trainName ?? train?.search?.name ?? train?.name ?? `Train ${trainNumber}`;
  const sourceName = details.sourceStationName ?? train?.search?.sourceName ?? '';
  const destName = details.destinationStationName ?? train?.search?.destinationName ?? '';

  const savedPayload = {
    number: String(trainNumber),
    name: trainName,
    sourceName,
    destinationName: destName,
    sourceCode: details.sourceStationCode || '',
    destinationCode: details.destinationStationCode || '',
    scheduledDepartureTime: stops[0]?.scheduledDepartureTime || '',
    scheduledArrivalTime: stops.at(-1)?.scheduledArrivalTime || '',
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(requestTrainRefresh({ trainNumber, journeyDate: live.journeyDate }));
    } finally {
      setTimeout(() => setRefreshing(false), 700);
    }
  };

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    addEventListener('keydown', fn);
    return () => removeEventListener('keydown', fn);
  }, []);

  return (
    <div className="train-detail-page">
      <section className="train-detail-head card-surface">
        {/* Top Row: Back button, Title & Route on left; Bookmark & Reload on right */}
        <div className="detail-head-top">
          <div className="detail-left-group">
            <button className="detail-back-button" type="button" onClick={() => navigate(-1)} aria-label="Go back" title="Go back">
              <ArrowLeft size={18} />
            </button>
            <div className="detail-main">
              <div className="detail-title-row">
                <span className="detail-number">{trainNumber}</span>
                <h1>{trainName}</h1>
                {(details.trainType || details.category || train?.search?.type) && (
                  <span className="train-tag">{details.trainType || details.category || train?.search?.type}</span>
                )}
              </div>
              <div className="detail-route-line">
                <span>{sourceName || 'Origin'}</span>
                <span>→</span>
                <span>{destName || 'Destination'}</span>
                <span className="detail-route-codes-inline">({details.sourceStationCode || train?.search?.sourceCode || '—'} · {details.destinationStationCode || train?.search?.destinationCode || '—'})</span>
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className={`icon-button ${isSaved(trainNumber) ? 'is-saved' : ''}`}
              onClick={() => toggleSaved(savedPayload)}
              aria-label="Save train"
              title={isSaved(trainNumber) ? 'Remove bookmark' : 'Bookmark train'}
            >
              <Bookmark size={16} fill={isSaved(trainNumber) ? 'currentColor' : 'none'} />
            </button>
            <button
              className="icon-button"
              onClick={refreshing ? undefined : refresh}
              aria-label="Refresh live data"
              title="Reload live data"
            >
              {refreshing ? <span className="refresh-dot" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        {/* Bottom Row: 4 Dedicated Telemetry Stat Cards */}
        <div className="detail-live-stats-bar">
          <div className="stat-card">
            <span className="stat-label">
              <Gauge size={13} /> Live speed
            </span>
            <div className="stat-value-wrap">
              <strong className="stat-value">{speed != null ? Math.round(Number(speed)) : '—'}</strong>
              <span className="stat-unit">km/h</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">
              <Route size={13} /> Distance covered
            </span>
            <div className="stat-value-wrap">
              <strong className="stat-value">{covered != null ? Math.round(covered) : 0}</strong>
              <span className="stat-unit">km</span>
              {total > 0 && <span className="stat-total">/ {Math.round(total)} km</span>}
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-label">
              <Clock size={13} /> Last updated
            </span>
            <div className="stat-value-wrap">
              <strong className="stat-value">{last ? formatTimeOnly(last, timeFormat) : 'Just now'}</strong>
            </div>
          </div>

          {/* Current Delay Stat Card: Dynamically updates with approaching station or selected station */}
          <div className={`stat-card current-delay-card ${currentTopDelay.isFocused ? 'is-focused' : ''}`}>
            <div className="flex items-center justify-between w-full">
              <span className="stat-label">
                <Timer size={13} /> Current delay
              </span>
              {currentTopDelay.isFocused && (
                <button
                  type="button"
                  onClick={() => setFocusedStation(null)}
                  className="text-[9px] text-[#0d716a] hover:underline font-semibold"
                  title="Reset to next approaching station"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="stat-value-wrap">
              <strong className={`stat-value delay-tag ${currentTopDelay.tone}`}>{currentTopDelay.label}</strong>
              {currentTopDelay.stationName && (
                <span className="stat-subtext text-[10px] text-[#527072] mt-0.5 block font-medium">
                  {currentTopDelay.isFocused ? 'Selected: ' : 'Approaching: '}
                  <b>{currentTopDelay.stationName}</b>
                  {currentTopDelay.etaTime && (
                    <span className="ml-1 text-[#0d716a] font-mono-ui font-semibold">
                      (ETA {formatTimeOnly(currentTopDelay.etaTime, timeFormat)})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`route-map-layout ${fullscreen ? 'map-fullscreen-layout' : ''}`}>
        <div className="route-pane card-surface">
          <div className="route-panel-title">
            <div>
              <span className="panel-eyebrow">Live journey</span>
              <h2>Route timeline</h2>
            </div>
          </div>
          <RouteTimeline
            train={trainWithEtas}
            timeFormat={timeFormat}
            onSelectStation={(st) => setFocusedStation(st)}
            focusedStationCode={focusedStation ? stationCode(focusedStation) : null}
          />
        </div>
        <TrainMap
          train={trainWithEtas}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen((v) => !v)}
          onRefresh={refresh}
          timeFormat={timeFormat}
        />
      </section>
    </div>
  );
}

