import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, IndianRupee, Calendar, Phone, User } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import {
  createBooking,
  fetchTempleBookPage,
  type TempleOffering,
  type TemplePage,
} from '../services/templeBook';

export default function TempleBookPage() {
  const { placeId } = useParams<{ placeId: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { session } = useAuth();
  const [page, setPage] = useState<TemplePage | null>(null);
  const [offerings, setOfferings] = useState<TempleOffering[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOffering, setBookingOffering] = useState<TempleOffering | null>(null);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    fetchTempleBookPage(placeId)
      .then((data) => {
        setPage(data.page);
        setOfferings(data.offerings);
        setIsAdmin(data.isAdmin);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Not found'))
      .finally(() => setLoading(false));
  }, [placeId]);

  useEffect(() => {
    if (session?.user?.name) setDonorName(session.user.name);
  }, [session?.user?.name]);

  const handleBook = async () => {
    if (!placeId || !bookingOffering) return;
    setSubmitting(true);
    try {
      await createBooking({
        placeId,
        offeringId: bookingOffering._id,
        donorName,
        donorPhone,
        preferredDate: preferredDate || undefined,
        preferredSlot: preferredSlot || undefined,
        notes,
      });
      alert('Request submitted! The temple will confirm via your contact details.');
      setBookingOffering(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const payment = page?.payment;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F4F1EA] text-[#141414]'
      }`}
    >
      <Navigation />
      <main className="max-w-4xl mx-auto pt-28 pb-16 px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center gap-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading…
          </div>
        ) : error || !page ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error || 'Temple not found'}</p>
            <Link to="/poojas" className="text-[#0D9488] underline">Back to directory</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-4xl font-semibold">{page.name}</h1>
                {page.address && (
                  <p className={`mt-2 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                    {page.address}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Link
                  to={`/temple-admin/${encodeURIComponent(page.placeId)}`}
                  className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium"
                >
                  Edit page
                </Link>
              )}
            </div>

            {page.images && page.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {page.images.slice(0, 6).map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.caption || page.name}
                    className="rounded-xl aspect-video object-cover w-full"
                  />
                ))}
              </div>
            )}

            {page.descriptionHtml && (
              <section
                className={`prose prose-sm max-w-none mb-10 ${isDark ? 'prose-invert' : ''}`}
                dangerouslySetInnerHTML={{ __html: page.descriptionHtml }}
              />
            )}

            {page.audio && page.audio.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-xl font-semibold mb-4">Audio</h2>
                <div className="space-y-3">
                  {page.audio.map((a, i) => (
                    <div key={i}>
                      {a.title && <p className="text-sm font-medium mb-1">{a.title}</p>}
                      <audio controls src={a.url} className="w-full max-w-md" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-10">
              <h2 className="font-display text-2xl font-semibold mb-4">Offerings</h2>
              {offerings.length === 0 ? (
                <p className={isDark ? 'text-white/50' : 'text-[#6E6A63]'}>
                  No offerings listed yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {offerings.map((o) => (
                    <div
                      key={o._id}
                      className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#0D9488] font-semibold">
                          {o.type}
                        </span>
                        <h3 className="font-semibold text-lg">{o.title}</h3>
                        {o.description && (
                          <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-[#6E6A63]'}`}>
                            {o.description}
                          </p>
                        )}
                        {o.price != null && (
                          <p className="mt-2 flex items-center gap-1 text-sm font-medium">
                            <IndianRupee className="w-4 h-4" />
                            {o.price} {o.currency || 'INR'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setBookingOffering(o)}
                        className="px-5 py-2.5 rounded-xl bg-[#D13B3B] text-white font-medium hover:bg-[#b83232] shrink-0"
                      >
                        {o.type === 'donation' ? 'Donate / Book' : 'Request booking'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(payment?.upiId || payment?.upiQrImageUrl || payment?.bankDetails) && (
              <section
                className={`mb-10 p-6 rounded-2xl border ${
                  isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white'
                }`}
              >
                <h2 className="font-display text-xl font-semibold mb-4">Payment details</h2>
                {payment.upiId && (
                  <p className="mb-3">
                    <strong>UPI:</strong> {payment.upiId}
                  </p>
                )}
                {payment.upiQrImageUrl && (
                  <img
                    src={payment.upiQrImageUrl}
                    alt="UPI QR"
                    className="max-w-[200px] rounded-lg border mb-4"
                  />
                )}
                {payment.bankDetails && (
                  <div className={`text-sm space-y-1 ${isDark ? 'text-white/70' : 'text-[#6E6A63]'}`}>
                    <p><strong>Account:</strong> {payment.bankDetails.accountName}</p>
                    <p><strong>Number:</strong> {payment.bankDetails.accountNumber}</p>
                    <p><strong>IFSC:</strong> {payment.bankDetails.ifsc}</p>
                    <p><strong>Bank:</strong> {payment.bankDetails.bankName}</p>
                    {payment.bankDetails.branch && (
                      <p><strong>Branch:</strong> {payment.bankDetails.branch}</p>
                    )}
                    <p className="text-xs mt-2 opacity-70">Use NEFT/IMPS for bank transfer donations.</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {bookingOffering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div
              className={`w-full max-w-md rounded-2xl p-6 shadow-xl ${
                isDark ? 'bg-[#1a1b1e] text-white' : 'bg-white'
              }`}
            >
              <h3 className="font-display text-xl font-semibold mb-4">
                {bookingOffering.title}
              </h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> Name
                  </span>
                  <input
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                    }`}
                  />
                </label>
                <label className="block">
                  <span className="text-sm flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3" /> Phone
                  </span>
                  <input
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                    }`}
                  />
                </label>
                {bookingOffering.requiresBooking && (
                  <>
                    <label className="block">
                      <span className="text-sm flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" /> Preferred date
                      </span>
                      <input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                        }`}
                      />
                    </label>
                    {bookingOffering.slots && bookingOffering.slots.length > 0 && (
                      <label className="block">
                        <span className="text-sm mb-1">Slot</span>
                        <select
                          value={preferredSlot}
                          onChange={(e) => setPreferredSlot(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                          }`}
                        >
                          <option value="">Select…</option>
                          {bookingOffering.slots.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
                <label className="block">
                  <span className="text-sm mb-1">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                    }`}
                  />
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setBookingOffering(null)}
                  className={`flex-1 py-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-black/5'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBook}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
              <p className="text-xs mt-3 opacity-60">
                Pay via UPI or bank details above after the temple confirms your request.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
