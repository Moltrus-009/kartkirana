import { useState } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { Star, MessageSquare, ShieldAlert, Send, Reply } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import { useLanguage } from '../context/LanguageContext';

export default function Reviews() {
  const { reviews, replyToCustomerReview, reportCustomerReview } = useAppStore();
  const { t } = useLanguage();
  
  // State
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // 1. Calculations
  const total = reviews.length;
  const avg = total > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
    : '5.0';

  const starsCount = [0, 0, 0, 0, 0]; // Index 0 -> 1 star, Index 4 -> 5 stars
  reviews.forEach(r => {
    const idx = Math.min(4, Math.max(0, Math.floor(r.rating) - 1));
    starsCount[idx]++;
  });

  const handleSendReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) return;
    await replyToCustomerReview(reviewId, text.trim());
    setReplyText(prev => ({ ...prev, [reviewId]: '' }));
  };

  const handleReport = async () => {
    if (!showReportModal || !reportReason.trim()) return;
    await reportCustomerReview(showReportModal, reportReason.trim());
    setShowReportModal(null);
    setReportReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100">{t('customer_reviews')}</h2>
        <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold mt-0.5">{t('reviews_subtitle')}</p>
      </div>

      {/* RATING AGGREGATION & BREAKDOWN */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-8 items-center shadow-xs">
        
        {/* Large Score */}
        <div className="text-center space-y-2 border-r border-slate-50 dark:border-dark-border/40 py-4">
          <h1 className="text-5xl font-black text-slate-800 dark:text-zinc-100 leading-none">{avg}</h1>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={`h-5 w-5 ${s <= parseFloat(avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Based on {total} reviews</span>
        </div>

        {/* Breakdown progress bar lists */}
        <div className="md:col-span-2 space-y-2 text-xs font-bold text-slate-500">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = starsCount[stars - 1] || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-10 text-right shrink-0">{stars} Star</span>
                <div className="flex-1 h-2.5 bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-slate-400 font-semibold">{count}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* REVIEWS STREAM FEED */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t('no_reviews')}
            description="Reviews submitted by customers will show up in this stream feed."
          />
        ) : (
          reviews.map((rev) => (
            <div 
              key={rev.id} 
              className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs text-xs text-left space-y-4 relative"
            >
              {/* Reviewer Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">{rev.customerName}</span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Stars list */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`h-3.5 w-3.5 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-100 dark:text-zinc-800'}`} 
                      />
                    ))}
                  </div>
                </div>

                {!rev.isReported ? (
                  <button 
                    onClick={() => setShowReportModal(rev.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    title={t('report_review')}
                  >
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <span className="text-[9px] text-red-500 bg-red-50 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    Reported
                  </span>
                )}
              </div>

              {/* Review Text */}
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-bold">
                {rev.comment}
              </p>

              {/* Reply Box Section */}
              {rev.reply ? (
                <div className="ml-4 md:ml-6 p-4 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-100 dark:border-dark-border flex items-start gap-3">
                  <Reply className="h-4.5 w-4.5 text-primary rotate-180 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black text-slate-800 dark:text-zinc-200">{t('merchant_reply')}</span>
                    <p className="text-slate-600 dark:text-zinc-400 font-bold leading-relaxed">{rev.reply.comment}</p>
                    <span className="text-[9px] text-slate-400 font-bold block">
                      {new Date(rev.reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="ml-4 md:ml-6 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('write_reply')}
                    value={replyText[rev.id] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [rev.id]: e.target.value }))}
                    className="flex-1 p-2 px-3 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none text-xs"
                  />
                  <button
                    onClick={() => handleSendReply(rev.id)}
                    className="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* REPORT REASON MODAL DIALOG */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl w-full max-w-sm shadow-2xl p-6 text-left">
            <h3 className="font-black text-sm mb-2 flex items-center gap-2 text-red-500">
              <ShieldAlert className="h-5 w-5" />
              Report Review
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">
              Flag this review to the platform administrators for removal.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{t('reporting_reason')}</label>
                <textarea
                  rows={3}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none text-xs"
                  placeholder={t('reporting_placeholder')}
                />
              </div>

              <div className="flex justify-end gap-2 text-[10px]">
                <button
                  onClick={() => { setShowReportModal(null); setReportReason(''); }}
                  className="px-4 py-2 border border-slate-100 dark:border-dark-border text-slate-400 font-black rounded-lg uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  className="px-4 py-2 bg-red-500 text-white font-black rounded-lg uppercase cursor-pointer"
                >
                  Report Abuse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
