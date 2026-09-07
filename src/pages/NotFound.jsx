import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function NotFound(){const navigate=useNavigate();return <div className="center-page"><div className="not-found"><span>404</span><h1>That track doesn't exist.</h1><p>Let's get you back to a live journey.</p><button className="primary-button" onClick={()=>navigate('/')}><ArrowLeft size={15}/> Back home</button></div></div>}
