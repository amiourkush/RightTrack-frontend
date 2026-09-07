import { Bookmark, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrainCard from '../components/trains/TrainCard';
import EmptyState from '../components/common/EmptyState';
import { useSavedTrains } from '../hooks/useSavedTrains';
export default function Saved() { const { saved } = useSavedTrains(); const navigate = useNavigate(); return <div className="page-stack"><section className="page-intro"><div><span className="eyebrow">Your shortcuts</span><h1>Saved trains</h1><p>Keep the journeys you check most close at hand.</p></div></section>{saved.length ? <div className="train-list">{saved.map((train) => <TrainCard key={train.number} train={train} variant="summary"/>)}</div> : <EmptyState icon={<Bookmark size={22} strokeWidth={1.8} />} title="Nothing saved yet" description="Save a train from the search results to find it here." action={<button className="primary-button small" onClick={() => navigate('/find-train')}><Search size={15}/> Find a train</button>} />}</div>; }
