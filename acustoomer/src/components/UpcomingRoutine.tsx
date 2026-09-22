import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { planningRequest } from '../services/planningService';
export function UpcomingRoutine() {
    const { user } = useAuth();
    const [upcoming, setUpcoming] = useState<{
        name: string;
        nextScheduledFor: string;
    } | null>(null);
    useEffect(() => { let active = true; setUpcoming(null); if (user?.uid)
        planningRequest<{
            routines: {
                name: string;
                nextScheduledFor: string;
                status: string;
            }[];
        }>('/routines').then(d => { if (active)
            setUpcoming(d.routines.filter(r => r.status === 'ACTIVE' && r.nextScheduledFor).sort((a, b) => a.nextScheduledFor.localeCompare(b.nextScheduledFor))[0] || null); }).catch(() => { }); return () => { active = false; }; }, [user?.uid]);
    return upcoming ? <Link to="/routines" className="mx-3 my-3 block rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900"><span className="block text-xs font-bold uppercase">Upcoming routine</span><strong>{upcoming.name}</strong><span className="block text-sm">{new Date(upcoming.nextScheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · Manage</span></Link> : null;
}
