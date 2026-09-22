import { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
type Report = {
    enabled: boolean;
    counts: Record<string, number>;
    executions: {
        id: string;
        routineId: string;
        scheduledFor: string;
        status: string;
        reason: string | null;
        generatedOrderId: string | null;
    }[];
};
export default function Routines() {
    const [data, setData] = useState<Report | null>(null), [error, setError] = useState('');
    async function load() { setError(''); try {
        setData(await adminService.routineReport());
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load routines.');
    } }
    useEffect(() => { void load(); }, []);
    return <main className="space-y-5"><h1 className="text-2xl font-bold">Routine orders</h1><button onClick={() => void load()} className="rounded border p-3">Refresh</button>{error && <p role="alert">{error}</p>}{data && <><p>Automatic processing: {data.enabled ? 'enabled' : 'disabled'}</p><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(data.counts).map(([name, count]) => <div key={name} className="rounded-xl border p-4"><p>{name}</p><strong className="text-2xl">{count}</strong></div>)}</div><p className="text-sm">Counts cover retained records. The table shows the latest 100 occurrences. Online payment and delivery outcomes are recorded on each generated order.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Scheduled (IST)', 'Routine', 'Status', 'Reason', 'Order'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.executions.map(e => <tr key={e.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(e.scheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td><td className="p-3 break-all">{e.routineId}</td><td className="p-3">{e.status}</td><td className="p-3">{e.reason || '—'}</td><td className="p-3 break-all">{e.generatedOrderId || '—'}</td></tr>)}</tbody></table></div></>}</main>;
}
