import { Bookmark, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrainCard from '../components/trains/TrainCard';
import EmptyState from '../components/common/EmptyState';
import { useSavedTrains } from '../hooks/useSavedTrains';

export default function Saved() {
  const { saved } = useSavedTrains();
  const navigate = useNavigate();

  return (
    <div className="saved-page-wrap">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Your shortcuts</span>
          <h1>Saved trains</h1>
          <p>Keep the journeys you check most close at hand.</p>
        </div>
      </section>

      {saved.length > 0 ? (
        <div className="train-list">
          {saved.map((train) => (
            <TrainCard key={train.number} train={train} variant="summary" />
          ))}
        </div>
      ) : (
        <div className="saved-empty-container">
          <EmptyState
            icon={<Bookmark size={24} strokeWidth={2} />}
            title="No saved trains yet"
            description="Save trains you check often for quick access later."
            action={
              <button
                type="button"
                className="primary-button small"
                onClick={() => navigate('/find-train')}
              >
                <Search size={14} /> Find a train
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
