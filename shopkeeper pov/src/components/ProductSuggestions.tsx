import { useState } from 'react';
import { searchProductSuggestions, type ProductSuggestion } from '../lib/productSuggestions';
import { useLanguage } from '../context/LanguageContext';

export default function ProductSuggestions({ onSelect }: { onSelect: (product: ProductSuggestion) => void }) {
  const [query, setQuery] = useState('');
  const { language } = useLanguage();
  const results = searchProductSuggestions(query);
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
    <label className="block text-xs font-bold text-slate-800">
      {language === 'hi' ? 'सामान्य उत्पाद खोजें (वैकल्पिक)' : 'Search common products (optional)'}
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={language === 'hi' ? 'जैसे दूध, आलू, चावल…' : 'Try milk, potato, rice…'} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900" />
    </label>
    <p className="text-xs text-slate-600">{language === 'hi' ? 'नाम, श्रेणी और सामान्य चित्र चुनें। विवरण व चित्र बदल सकते हैं। कीमत आप तय करें।' : 'Choose a name, category and generic image. Edit the details or replace the image. You set the price.'}</p>
    {query.trim() && <div className="grid gap-2" aria-live="polite">
      {results.map(p => <button key={p.name} type="button" onClick={() => { onSelect(p); setQuery(''); }} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 text-left text-sm text-slate-900 hover:border-emerald-500">
        <img src={p.image} alt="" className="w-10 h-10 rounded-lg" /><span>{p.name}</span>
      </button>)}
      {!results.length && <p className="text-xs text-slate-600">{language === 'hi' ? 'उत्पाद नहीं मिला। नीचे विवरण भरें।' : 'No suggestion found. Enter your product details below.'}</p>}
    </div>}
  </div>;
}
