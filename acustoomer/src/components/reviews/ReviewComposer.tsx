import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../core/store/useAppStore';
import { dbService } from '../../services/dbService';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Review } from '../../types';

interface ReviewComposerProps {
  targetId: string;
  targetName: string;
  shopId: string;
  onSubmitted: (review: Review) => void;
}

/** A review can only be submitted by a customer with a completed order from the same shop. */
export const ReviewComposer: React.FC<ReviewComposerProps> = ({ targetId, targetName, shopId, onSubmitted }) => {
  const { user } = useAuth();
  const orders = useAppStore(state => state.orders);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) void dbService.getOrders(user.uid);
  }, [user]);

  const canReview = orders.some(order =>
    order.shopId === shopId && ['DELIVERED', 'COMPLETED', 'delivered'].includes(order.status)
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !canReview || !comment.trim()) return;
    setSubmitting(true);
    try {
      const review = await dbService.addReview({
        targetId,
        userId: user.uid,
        userName: user.name || 'Customer',
        userImage: user.profileImage,
        rating,
        comment: comment.trim(),
      });
      onSubmitted(review);
      setComment('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <div className="mt-4 rounded-2xl border border-blue-100 dark:border-blue-950/50 bg-blue-50/50 dark:bg-blue-950/10 p-3.5 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black text-slate-800 dark:text-white">Ordered from {targetName}?</p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Verified customers can share a rating after delivery.</p>
      </div>
      <Button onClick={() => setOpen(true)} disabled={!canReview} className="shrink-0 rounded-xl px-3 py-2 text-[10px] font-black">
        Rate
      </Button>
    </div>
    {!canReview && <p className="mt-2 text-[10px] font-semibold text-slate-400">Ratings unlock after a delivered order from this store.</p>}
    <Dialog isOpen={open} onClose={() => setOpen(false)} title={`Rate ${targetName}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2" aria-label="Choose a rating">
          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? '' : 's'}`} className="p-1">
            <Star className={`h-7 w-7 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>)}
        </div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
          Tell others about your experience
          <textarea value={comment} onChange={event => setComment(event.target.value)} required maxLength={500} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800" placeholder="Fresh items, great packing, quick delivery…" />
        </label>
        <Button type="submit" fullWidth disabled={submitting || !comment.trim()} className="rounded-xl py-3 text-xs font-black">
          {submitting ? 'Submitting…' : 'Submit rating'}
        </Button>
      </form>
    </Dialog>
  </>;
};
