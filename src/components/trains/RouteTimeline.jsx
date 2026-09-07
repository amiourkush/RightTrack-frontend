import { Check, ChevronDown, ChevronRight, TrainFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  formatTimeOnly,
  getDelayMinutes,
  getDistanceCovered,
  getLiveSequence,
  getMainSections,
  getMergedRouteStops,
  getStationEtaPredictions,
  getTotalDistance,
  normalizeLive,
  stationCode,
  stationName,
} from '../../utils/train';

function phaseOf(train) {
  const s = String(normalizeLive(train?.live || {}).status || '').toUpperCase();
  if (!s) return 'unknown';
  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(s)) return 'not-started';
  if (/CANCEL/.test(s)) return 'cancelled';
  if (/COMPLET|TERMINAT/.test(s)) return 'completed';
  return /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(s) ? 'running' : 'unknown';
}

function sectionProgress(section, live, sequence) {
  if (live?.segmentProgress != null && Number(live.segmentProgress) > 0) {
    return Math.max(0.08, Math.min(0.92, Number(live.segmentProgress)));
  }
  const currCode = String(live?.currentStationCode || '').toUpperCase();
  if (currCode && section.intermediate.length > 0) {
    const idx = section.intermediate.findIndex((m) => stationCode(m).toUpperCase() === currCode);
    if (idx >= 0) {
      return Math.max(0.12, Math.min(0.88, (idx + 1) / (section.intermediate.length + 1)));
    }
  }
  const start = Number(section.main.sequence || 0);
  const end = Number(section.next?.sequence || section.intermediate.at(-1)?.sequence || start + 1);
  if (sequence && end > start) {
    return Math.max(0.08, Math.min(0.92, (Number(sequence) - start) / (end - start)));
  }
  return 0.5;
}

function formatHalt(arr, dep) {
  const diff = getDelayMinutes(arr, dep);
  if (diff == null || diff <= 0) return null;
  if (diff >= 60) return `${Math.floor(diff / 60)}h ${diff % 60}m halt`;
  return `${diff}m halt`;
}

export default function RouteTimeline({ train, timeFormat = 'H24', onSelectStation, focusedStationCode }) {
  const stops = useMemo(() => getMergedRouteStops(train), [train]);
  const sections = useMemo(() => getMainSections(stops), [stops]);
  const live = normalizeLive(train?.live || {});
  const phase = phaseOf(train);
  const running = phase === 'running';
  const sequence = running ? getLiveSequence(train) : 0;
  const totalDist = getTotalDistance(train);
  const coveredDist = getDistanceCovered(train);

  const activeIndex = useMemo(() => {
    if (!running) return -1;
    const prevHalt = String(live.previousHaltCode || '').toUpperCase();
    const nextHalt = String(live.nextHaltCode || '').toUpperCase();
    const currCode = String(live.currentStationCode || '').toUpperCase();

    // 1. Exact match with previousHaltCode on main station
    if (prevHalt) {
      const found = sections.findIndex((s) => stationCode(s.main).toUpperCase() === prevHalt);
      if (found >= 0) return found;
    }

    // 2. Match currentStationCode on main or intermediate stops
    if (currCode) {
      const foundMain = sections.findIndex((s) => stationCode(s.main).toUpperCase() === currCode);
      if (foundMain >= 0) return foundMain;
      const foundInter = sections.findIndex((s) => s.intermediate.some((m) => stationCode(m).toUpperCase() === currCode));
      if (foundInter >= 0) return foundInter;
    }

    // 3. Match nextHaltCode
    if (nextHalt) {
      const foundNext = sections.findIndex((s) => stationCode(s.main).toUpperCase() === nextHalt);
      if (foundNext > 0) return foundNext - 1;
    }

    // 4. Match sequence
    if (sequence) {
      let idx = -1;
      sections.forEach((s, i) => {
        const a = Number(s.main.sequence || 0);
        const b = Number(sections[i + 1]?.main.sequence || Number.MAX_SAFE_INTEGER);
        if (sequence >= a && sequence < b) idx = i;
      });
      if (idx >= 0) return idx;
    }

    // 5. Match covered distance
    if (coveredDist != null && coveredDist > 0) {
      let idx = -1;
      sections.forEach((s, i) => {
        const a = Number(s.main.distanceKm || 0);
        const b = Number(sections[i + 1]?.main.distanceKm || Number.MAX_SAFE_INTEGER);
        if (coveredDist >= a && coveredDist < b) idx = i;
      });
      if (idx >= 0) return idx;
    }

    return -1;
  }, [sections, running, live, sequence, coveredDist]);

  const [expanded, setExpanded] = useState({});

  // Auto-expand section where train is currently running or passing
  useEffect(() => {
    if (activeIndex >= 0 && sections[activeIndex]) {
      const c = stationCode(sections[activeIndex].main);
      if (c) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded((x) => (x[c] ? x : { ...x, [c]: true }));
      }
    }
  }, [activeIndex, sections]);

  if (!sections.length) {
    return (
      <div className="route-empty-state">
        <TrainFront size={28} className="mb-2 text-[#9bb0af]" />
        <p>Route schedule and station stops will appear here.</p>
      </div>
    );
  }

  return (
    <div className="route-timeline-container">
      {/* Header Info Legend */}
      <div className="route-timeline-legend">
        <div className="legend-items-group">
          <div className="legend-item">
            <span className="legend-bullet track-bullet" />
            <span>Main Station</span>
          </div>
          <div className="legend-item">
            <span className="legend-bullet live-bullet" />
            <span>Train En Route</span>
          </div>
          <div className="legend-item">
            <span className="legend-bullet ontime-bullet" />
            <span>On Time</span>
          </div>
          <div className="legend-item">
            <span className="legend-bullet late-bullet" />
            <span>Delayed</span>
          </div>
        </div>
        <div className="legend-distance-tag">
          <span>
            Distance: <strong>{coveredDist != null ? `${Math.round(coveredDist)} km` : '0 km'}</strong>
            {totalDist ? ` of ${Math.round(totalDist)} km` : ''}
          </span>
        </div>
      </div>

      <div className="route-scroll-area">
        {sections.map((section, i) => {
          const code = stationCode(section.main);
          const isOrigin = i === 0;
          const isDestination = i === sections.length - 1;
          const isLast = isDestination;
          const open = Boolean(expanded[code]);
          const active = i === activeIndex;
          const isPassed = running && activeIndex >= 0 && i < activeIndex;
          const isCurrentStation = running && (String(live.currentStationCode || '').toUpperCase() === code.toUpperCase() || (sequence > 0 && Number(section.main.sequence) === Number(sequence)));
          const prog = active ? sectionProgress(section, live, sequence) : isPassed ? 1 : 0;
          const etaPred = getStationEtaPredictions(train, section.main);
          const halt = formatHalt(section.main.scheduledArrivalTime, section.main.scheduledDepartureTime);
          const isFocused = focusedStationCode && String(focusedStationCode).toUpperCase() === code.toUpperCase();

          const toggleAccordion = (e) => {
            if (e) e.stopPropagation();
            if (section.intermediate.length > 0) {
              setExpanded((x) => ({ ...x, [code]: !open }));
            }
          };

          const handleStationCardClick = () => {
            if (onSelectStation) {
              onSelectStation(section.main);
            }
            if (section.intermediate.length > 0) {
              setExpanded((x) => ({ ...x, [code]: !open }));
            }
          };

          return (
            <div
              key={`${code}-${section.main.sequence}`}
              className={`route-segment-row ${active ? 'is-active-segment' : ''} ${isPassed ? 'is-passed-segment' : ''} ${isFocused ? 'is-focused-segment' : ''}`}
            >
              {/* Left Column: Main vertical track line where train crosses */}
              <div className="route-track-column">
                {/* Continuous track backbone */}
                {!isLast && <div className="route-track-line-base" />}
                {!isLast && isPassed && <div className="route-track-line-passed" />}
                {!isLast && active && (
                  <div
                    className="route-track-line-active"
                    style={{ height: `${Math.max(16, Math.min(100, prog * 100))}%` }}
                  />
                )}

                {/* Station Node on the Track (clickable) */}
                <div
                  className={`route-station-node ${isPassed ? 'node-passed' : ''} ${isCurrentStation ? 'node-current' : ''} ${active && !isCurrentStation ? 'node-active' : ''} ${section.intermediate.length > 0 ? 'cursor-pointer' : ''}`}
                  onClick={handleStationCardClick}
                  title={`${stationName(section.main)} (${code}) - Click to view details${section.intermediate.length > 0 ? ' and toggle intermediate stations' : ''}`}
                >
                  {isPassed ? (
                    <Check size={11} strokeWidth={3} className="node-check-icon" />
                  ) : isCurrentStation ? (
                    <>
                      <span className="node-pulse-beacon" />
                      <span className="node-center-dot" />
                    </>
                  ) : (
                    <span className="node-dot" />
                  )}
                </div>

                {/* Live Train animation docked at station */}
                {isCurrentStation && (
                  <div className="route-station-docked-train" title="Train currently at station">
                    <span className="docked-train-pulse" />
                    <div className="docked-train-icon">
                      <TrainFront size={12} strokeWidth={2.5} />
                    </div>
                  </div>
                )}

                {/* Live Train animation crossing along the active track segment */}
                {active && !isCurrentStation && (
                  <div
                    className="route-live-train-marker"
                    style={{
                      top: `${Math.max(14, Math.min(86, prog * 100))}%`,
                    }}
                    title={`Train en route towards ${section.next ? stationName(section.next) : 'next station'}`}
                  >
                    <div className="train-pulse-ring" />
                    <div className="train-pulse-outer" />
                    <div className="train-icon-badge">
                      <TrainFront size={13} strokeWidth={2.5} />
                    </div>
                    <div className="train-crossing-tag">
                      <span>⚡ Running</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Station Card with Vertically Stacked Scheduled vs ETA */}
              <div
                className={`route-station-card ${isCurrentStation ? 'current-card' : ''} ${isPassed ? 'passed-card' : ''} ${section.intermediate.length > 0 ? 'has-intermediates' : ''} ${isFocused ? 'focused-card' : ''}`}
                onClick={handleStationCardClick}
                style={{ cursor: 'pointer' }}
                title="Click station to view ETA/delay at top and toggle intermediate stations"
              >
                {/* Station Header */}
                <div className="station-card-head">
                  <div className="station-title-group">
                    <h3 className="station-name-text">{stationName(section.main)}</h3>
                    <span className="station-code-pill">{code}</span>
                    {section.main.platform && (
                      <span className="station-platform-pill">PF {section.main.platform}</span>
                    )}
                    {halt && <span className="station-halt-pill">{halt}</span>}
                    {section.main.distanceKm != null && (
                      <span className="station-distance-pill">{section.main.distanceKm} km</span>
                    )}
                    {section.intermediate.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAccordion}
                        className={`station-intermediate-pill ${open ? 'is-open' : ''}`}
                        title="Click to toggle intermediate stations"
                      >
                        <span>{open ? 'Hide' : 'Show'} {section.intermediate.length} intermediate stops</span>
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                  </div>

                  <div className="station-status-indicator">
                    {isCurrentStation ? (
                      <span className="status-badge current">
                        <span className="live-pulsing-dot" /> At Station
                      </span>
                    ) : isPassed ? (
                      <span className="status-badge passed">Passed</span>
                    ) : active && section.next ? (
                      <span className="status-badge next">Departed</span>
                    ) : (
                      <span className="status-badge upcoming">Upcoming</span>
                    )}
                  </div>
                </div>

                {/* Station Wise Scheduled Time & Station Wise ETA directly below it */}
                <div className="station-eta-grid">
                  {/* Arrival Column */}
                  <div className="eta-column arrival-box">
                    <div className="eta-column-label">
                      <span>Arrival</span>
                      {isOrigin && <small className="tag-special">Origin</small>}
                    </div>

                    {isOrigin ? (
                      <div className="eta-special-message">First Station · Originates</div>
                    ) : (
                      <div className="eta-stack-container">
                        {/* Line 1: Scheduled Arrival */}
                        <div className="eta-stack-section scheduled-section">
                          <span className="stack-caption">Scheduled:</span>
                          <strong className="stack-time sched-time">
                            {formatTimeOnly(section.main.scheduledArrivalTime, timeFormat)}
                          </strong>
                        </div>

                        {/* Line 2 (BELOW): ETA Arrival with Delay Badge */}
                        <div className="eta-stack-section expected-section">
                          <span className="stack-caption">ETA Arrival:</span>
                          <strong className={`stack-time eta-time ${etaPred.arrivalTone}`}>
                            {etaPred.arrivalEta ? formatTimeOnly(etaPred.arrivalEta, timeFormat) : '—'}
                          </strong>
                          <span className={`delay-badge ${etaPred.arrivalTone}`}>
                            {etaPred.delayLabel || (etaPred.arrivalTone === 'on-time'
                              ? 'On time'
                              : etaPred.delayMinutes > 0
                              ? `+${etaPred.delayMinutes}m late`
                              : `${Math.abs(etaPred.delayMinutes)}m early`)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Departure Column */}
                  <div className="eta-column departure-box">
                    <div className="eta-column-label">
                      <span>Departure</span>
                      {isDestination && <small className="tag-special">Destination</small>}
                    </div>

                    {isDestination ? (
                      <div className="eta-special-message">Final Destination · Terminates</div>
                    ) : (
                      <div className="eta-stack-container">
                        {/* Line 1: Scheduled Departure */}
                        <div className="eta-stack-section scheduled-section">
                          <span className="stack-caption">Scheduled:</span>
                          <strong className="stack-time sched-time">
                            {formatTimeOnly(section.main.scheduledDepartureTime, timeFormat)}
                          </strong>
                        </div>

                        {/* Line 2 (BELOW): ETA Departure with Delay Badge */}
                        <div className="eta-stack-section expected-section">
                          <span className="stack-caption">ETA Departure:</span>
                          <strong className={`stack-time eta-time ${etaPred.departureTone}`}>
                            {etaPred.departureEta ? formatTimeOnly(etaPred.departureEta, timeFormat) : '—'}
                          </strong>
                          <span className={`delay-badge ${etaPred.departureTone}`}>
                            {etaPred.departureTone === 'on-time'
                              ? 'On time'
                              : etaPred.delayMinutes > 0
                              ? `+${etaPred.delayMinutes}m late`
                              : `${Math.abs(etaPred.delayMinutes)}m early`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Intermediate Stations Accordion */}
                {section.intermediate.length > 0 && (
                  <div className="intermediate-accordion" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={toggleAccordion}
                      className="intermediate-toggle-btn"
                    >
                      <span className="toggle-badge-icon">
                        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                      <span className="toggle-text">
                        {open ? 'Hide' : 'Show'} <strong>{section.intermediate.length} intermediate stations</strong> {section.next ? `between ${code} and ${stationCode(section.next)}` : ''}
                      </span>
                    </button>

                    {open && (
                      <div className="intermediate-list">
                        {section.intermediate.map((mid) => {
                          const mcode = stationCode(mid);
                          const midEta = getStationEtaPredictions(train, mid);
                          const midCurrent = running && (Number(mid.sequence) === Number(sequence) || String(live.currentStationCode || '').toUpperCase() === mcode.toUpperCase());
                          const midPassed = running && ((sequence > 0 && Number(mid.sequence) < Number(sequence)) || isPassed);
                          const isMidFocused = focusedStationCode && String(focusedStationCode).toUpperCase() === mcode.toUpperCase();

                          return (
                            <div
                              key={`${mcode}-${mid.sequence}`}
                              className={`intermediate-item-row ${midCurrent ? 'is-current' : ''} ${midPassed ? 'is-passed' : ''} ${isMidFocused ? 'is-focused' : ''}`}
                              onClick={() => onSelectStation?.(mid)}
                              style={{ cursor: 'pointer' }}
                              title="Click to view this intermediate station delay at top"
                            >
                              <div className="intermediate-track-node">
                                {midCurrent ? (
                                  <span className="sub-dot live-dot" />
                                ) : (
                                  <span className="sub-dot" />
                                )}
                              </div>
                              <div className="intermediate-meta">
                                <span className="intermediate-name">{stationName(mid)}</span>
                                <span className="intermediate-code">{mcode}</span>
                                {mid.platform && (
                                  <span className="intermediate-plat">PF {mid.platform}</span>
                                )}
                                {mid.distanceKm != null && (
                                  <span className="intermediate-dist">{mid.distanceKm} km</span>
                                )}
                                {midCurrent && (
                                  <span className="intermediate-live-pill">Passing Now</span>
                                )}
                              </div>
                              <div className="intermediate-times">
                                <div className="intermediate-time-col">
                                  <span className="intermediate-caption">Sched:</span>
                                  <span className="intermediate-sched">
                                    {formatTimeOnly(mid.scheduledArrivalTime || mid.scheduledDepartureTime, timeFormat)}
                                  </span>
                                </div>
                                {(midEta.arrivalEta || midEta.departureEta) && (
                                  <div className="intermediate-time-col">
                                    <span className="intermediate-caption">ETA:</span>
                                    <span className={`intermediate-eta ${midEta.arrivalTone}`}>
                                      {formatTimeOnly(midEta.arrivalEta || midEta.departureEta, timeFormat)}
                                    </span>
                                  </div>
                                )}
                                {midEta.delayMinutes !== 0 && (
                                  <span className={`intermediate-delay-pill ${midEta.arrivalTone}`}>
                                    {midEta.delayLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

