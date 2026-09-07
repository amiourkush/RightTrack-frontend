import { Loader2, Search, TrainFront, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { searchTrainsGet } from '../../services/api/trainApi';

export default function SearchBox({
  initialValue = '',
  placeholder = 'Enter 5-digit train number (e.g. 12314, 15119)…',
  onResult,
  onSelectTrain,
}) {
  const [value, setValue] = useState(initialValue);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownItems, setDropdownItems] = useState([]);
  const containerRef = useRef(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    skipSearchRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initialValue || '');
    setDropdownOpen(false);
  }, [initialValue]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch train and open dropdown only on 5-digit number when user is actively typing
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      setDropdownOpen(false);
      return;
    }

    const q = value.trim();
    if (!q || !/^\d{5}$/.test(q)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDropdownOpen(false);
      setDropdownItems([]);
      setDropdownLoading(false);
      if (!q) onResult?.('');
      return;
    }

    let active = true;
    setDropdownLoading(true);
    setDropdownOpen(true);

    searchTrainsGet(q)
      .then((res) => {
        if (!active) return;
        const data = res?.data || {};
        const rawItems = Array.isArray(data?.trains)
          ? data.trains
          : Array.isArray(data?.results)
          ? data.results
          : [];
        const items = rawItems.map((item) => ({
          number: String(item.trainNumber ?? item.number ?? q),
          name: item.trainName ?? item.name ?? 'Unnamed Service',
        }));
        setDropdownItems(items);
      })
      .catch(() => {
        if (!active) return;
        setDropdownItems([]);
      })
      .finally(() => {
        if (active) setDropdownLoading(false);
      });

    return () => {
      active = false;
    };
  }, [value, onResult]);

  const selectTrain = (train) => {
    skipSearchRef.current = true;
    setValue(train.number);
    setDropdownOpen(false);
    setDropdownItems([]);
    if (onSelectTrain) {
      onSelectTrain(train);
    } else {
      onResult?.(train.number);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    if (/^\d{5}$/.test(q)) {
      if (dropdownItems.length > 0) {
        selectTrain(dropdownItems[0]);
      } else {
        onResult?.(q);
      }
    } else if (q.length >= 2 && !/^\d+$/.test(q)) {
      onResult?.(q);
    }
  };

  const clear = () => {
    setValue('');
    setDropdownOpen(false);
    setDropdownItems([]);
    onResult?.('');
  };

  return (
    <div ref={containerRef} className="search-box-wrap relative w-full">
      <form onSubmit={submit} className="search-box search-box-large">
        <Search size={18} />
        <input
          value={value}
          onChange={(e) => {
            skipSearchRef.current = false;
            setValue(e.target.value);
          }}
          placeholder={placeholder}
          maxLength={10}
        />
        {value && (
          <button type="button" className="search-clear" onClick={clear} aria-label="Clear search">
            <X size={15} />
          </button>
        )}
        <button className="search-submit" type="submit" aria-label="Search">
          <Search size={16} className="text-white" strokeWidth={2.2} />
        </button>
      </form>

      {/* 5-Digit Train Dropdown */}
      {dropdownOpen && (
        <div className="search-dropdown-menu absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-[#dce7e4] bg-white p-1.5 shadow-[0_18px_45px_rgba(20,57,59,.16)] backdrop-blur-xl">
          {dropdownLoading ? (
            <div className="flex items-center gap-2.5 px-4 py-3 text-[11px] text-[#6d8486]">
              <Loader2 size={14} className="animate-spin text-[#0d716a]" />
              <span>Fetching train {value}…</span>
            </div>
          ) : dropdownItems.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-[#8e9f9f]">
                Select train to view route
              </div>
              {dropdownItems.map((train) => (
                <button
                  key={train.number}
                  type="button"
                  onClick={() => selectTrain(train)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#eef7f4]"
                >
                  <span className="flex h-7 min-w-[50px] items-center justify-center rounded-lg bg-[#e8f5f1] font-mono-ui text-[11px] font-bold text-[#0c716a]">
                    {train.number}
                  </span>
                  <span className="truncate text-[13px] font-semibold text-[#183d41]">
                    {train.name}
                  </span>
                  <TrainFront size={14} className="ml-auto text-[#94a6a7]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-[11px] text-[#718688]">
              No train found with number <strong>{value}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
