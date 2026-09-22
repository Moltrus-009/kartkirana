import React, { useState } from 'react';
import { useAddress } from '../context/AddressContext';
import { AddressSelectorModal } from './AddressSelectorModal';
export function PlanningAddressPicker({ value, onSelect }: {
    value?: string;
    onSelect?: (id: string) => void;
}) {
    const { addresses, selectedAddress, selectAddress, addAddress } = useAddress();
    const [open, setOpen] = useState(false);
    const select = (id: string) => { selectAddress(id); onSelect?.(id); };
    return <section className="space-y-2"><label className="block">Delivery address<select aria-label="Delivery address" className="mt-2 w-full rounded-lg border bg-transparent p-3" value={value ?? selectedAddress?.id ?? ''} onChange={e => select(e.target.value)}><option value="">Choose a saved address</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.name} · {a.details}</option>)}</select></label><button type="button" className="text-sm font-semibold text-blue-700 dark:text-blue-300" onClick={() => setOpen(true)}>Add delivery address</button><AddressSelectorModal isOpen={open} onClose={() => setOpen(false)} onSave={async (input) => { const address = await addAddress({ ...input, isDefault: true }); onSelect?.(address.id); setOpen(false); return address; }}/></section>;
}
