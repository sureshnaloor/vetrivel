import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import DashboardShell from '../components/dashboard/DashboardShell';
import { useTheme } from '../hooks/useTheme';
import {
  createOffering,
  deleteOffering,
  fetchTempleBookPage,
  fetchTempleBookings,
  updateBookingStatus,
  upsertTemplePage,
  type TempleBooking,
  type TempleMediaItem,
  type TempleOffering,
  type TemplePage,
} from '../services/templeBook';

type Tab = 'details' | 'media' | 'offerings' | 'payment' | 'bookings';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TempleAdminEditor() {
  const { placeId } = useParams<{ placeId: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<TemplePage | null>(null);
  const [offerings, setOfferings] = useState<TempleOffering[]>([]);
  const [bookings, setBookings] = useState<TempleBooking[]>([]);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [images, setImages] = useState<TempleMediaItem[]>([]);
  const [videos, setVideos] = useState<TempleMediaItem[]>([]);
  const [audio, setAudio] = useState<TempleMediaItem[]>([]);
  const [upiId, setUpiId] = useState('');
  const [upiQrImageUrl, setUpiQrImageUrl] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  const [newOfferingTitle, setNewOfferingTitle] = useState('');
  const [newOfferingType, setNewOfferingType] = useState<TempleOffering['type']>('puja');
  const [newOfferingPrice, setNewOfferingPrice] = useState('');
  const [newOfferingDesc, setNewOfferingDesc] = useState('');

  const load = async () => {
    if (!placeId) return;
    setLoading(true);
    try {
      const data = await fetchTempleBookPage(placeId);
      const p = data.page;
      setPage(p);
      setOfferings(data.offerings);
      setName(p.name);
      setAddress(p.address || '');
      setDescriptionHtml(p.descriptionHtml || '');
      setIsPublished(Boolean(p.isPublished));
      setImages(p.images || []);
      setVideos(p.videos || []);
      setAudio(p.audio || []);
      setUpiId(p.payment?.upiId || '');
      setUpiQrImageUrl(p.payment?.upiQrImageUrl || '');
      setBankAccountName(p.payment?.bankDetails?.accountName || '');
      setBankAccountNumber(p.payment?.bankDetails?.accountNumber || '');
      setBankIfsc(p.payment?.bankDetails?.ifsc || '');
      setBankName(p.payment?.bankDetails?.bankName || '');
      setBankBranch(p.payment?.bankDetails?.branch || '');
      const b = await fetchTempleBookings(placeId);
      setBookings(b);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [placeId]);

  const savePage = async () => {
    if (!placeId) return;
    setSaving(true);
    try {
      await upsertTemplePage(placeId, {
        name,
        address,
        descriptionHtml,
        isPublished,
        images,
        videos,
        audio,
        coordinates: page?.coordinates,
        payment: {
          upiId,
          upiQrImageUrl,
          bankDetails: {
            accountName: bankAccountName,
            accountNumber: bankAccountNumber,
            ifsc: bankIfsc,
            bankName,
            branch: bankBranch,
          },
        },
      });
      alert('Saved');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addImage = async (file: File) => {
    const url = await readFileAsDataUrl(file);
    setImages((prev) => [...prev, { url }]);
  };

  const addAudio = async (file: File) => {
    const url = await readFileAsDataUrl(file);
    setAudio((prev) => [...prev, { url, title: file.name }]);
  };

  const addVideoUrl = (url: string) => {
    if (!url.trim()) return;
    setVideos((prev) => [...prev, { url: url.trim() }]);
  };

  const handleAddOffering = async () => {
    if (!placeId || !newOfferingTitle.trim()) return;
    try {
      await createOffering(placeId, {
        type: newOfferingType,
        title: newOfferingTitle,
        description: newOfferingDesc,
        price: newOfferingPrice ? Number(newOfferingPrice) : null,
        requiresBooking: newOfferingType === 'puja',
      });
      setNewOfferingTitle('');
      setNewOfferingDesc('');
      setNewOfferingPrice('');
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'media', label: 'Media' },
    { id: 'offerings', label: 'Offerings' },
    { id: 'payment', label: 'Payment' },
    { id: 'bookings', label: 'Bookings' },
  ];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/temple-admin" className="text-sm text-[#0D9488] hover:underline">
            ← All temples
          </Link>
          <h1 className="font-display text-3xl font-semibold mt-2">{name || 'Temple page'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {page?.isPublished && placeId && (
            <Link
              to={`/poojas/${encodeURIComponent(placeId)}`}
              className="text-sm text-[#0D9488] underline"
            >
              View public page
            </Link>
          )}
          <button
            onClick={savePage}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] text-white font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === t.id
                ? 'bg-[#0D9488] text-white'
                : isDark
                  ? 'bg-white/10'
                  : 'bg-black/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <div className={`p-6 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          {tab === 'details' && (
            <div className="space-y-4 max-w-2xl">
              <label className="block">
                <span className="text-sm font-medium">Temple name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                  }`}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                  }`}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Description (HTML supported)</span>
                <textarea
                  value={descriptionHtml}
                  onChange={(e) => setDescriptionHtml(e.target.value)}
                  rows={10}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                    isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                  }`}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>Publish page (visible in Book directory)</span>
              </label>
            </div>
          )}

          {tab === 'media' && (
            <div className="space-y-8">
              <section>
                <h3 className="font-semibold mb-2">Images</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addImage(f);
                  }}
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.url} alt="" className="rounded-lg aspect-video object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Videos (YouTube / direct URL)</h3>
                <input
                  placeholder="Paste video URL"
                  className={`w-full px-3 py-2 rounded-lg border mb-2 ${
                    isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addVideoUrl((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <ul className="text-sm space-y-1">
                  {videos.map((v, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{v.url}</span>
                      <button onClick={() => setVideos(videos.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2">Audio</h3>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addAudio(f);
                  }}
                />
                <ul className="mt-2 space-y-2">
                  {audio.map((a, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <audio controls src={a.url} className="max-w-xs" />
                      <button onClick={() => setAudio(audio.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {tab === 'offerings' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add offering
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={newOfferingType}
                    onChange={(e) => setNewOfferingType(e.target.value as TempleOffering['type'])}
                    className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                  >
                    <option value="puja">Puja</option>
                    <option value="donation">Donation</option>
                    <option value="prasad">Prasad</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    placeholder="Title"
                    value={newOfferingTitle}
                    onChange={(e) => setNewOfferingTitle(e.target.value)}
                    className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                  />
                  <input
                    placeholder="Price (INR)"
                    value={newOfferingPrice}
                    onChange={(e) => setNewOfferingPrice(e.target.value)}
                    className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                  />
                  <input
                    placeholder="Description"
                    value={newOfferingDesc}
                    onChange={(e) => setNewOfferingDesc(e.target.value)}
                    className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
                  />
                </div>
                <button
                  onClick={handleAddOffering}
                  className="mt-3 px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm"
                >
                  Add
                </button>
              </div>
              <ul className="space-y-3">
                {offerings.map((o) => (
                  <li
                    key={o._id}
                    className={`p-4 rounded-xl flex justify-between items-start gap-4 ${
                      isDark ? 'bg-white/5' : 'bg-black/5'
                    }`}
                  >
                    <div>
                      <span className="text-xs uppercase text-[#0D9488]">{o.type}</span>
                      <p className="font-semibold">{o.title}</p>
                      {o.price != null && <p className="text-sm">₹{o.price}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('Remove offering?')) {
                          await deleteOffering(o._id);
                          load();
                        }
                      }}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'payment' && (
            <div className="space-y-4 max-w-md">
              <label className="block">
                <span className="text-sm font-medium">UPI ID</span>
                <input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="temple@upi"
                  className={`mt-1 w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-black/30 border-white/10' : 'border-black/10'
                  }`}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">UPI QR image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setUpiQrImageUrl(await readFileAsDataUrl(f));
                  }}
                />
                {upiQrImageUrl && (
                  <img src={upiQrImageUrl} alt="QR" className="mt-2 max-w-[180px] rounded-lg" />
                )}
              </label>
              <hr className={isDark ? 'border-white/10' : 'border-black/10'} />
              <p className="text-sm font-medium">NEFT / bank transfer</p>
              <input
                placeholder="Account name"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
              />
              <input
                placeholder="Account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
              />
              <input
                placeholder="IFSC"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
              />
              <input
                placeholder="Bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
              />
              <input
                placeholder="Branch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-black/30 border-white/10' : ''}`}
              />
            </div>
          )}

          {tab === 'bookings' && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <p className={isDark ? 'text-white/50' : 'text-[#6E6A63]'}>No booking requests yet.</p>
              ) : (
                bookings.map((b) => (
                  <div
                    key={b._id}
                    className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-semibold">{b.offeringTitle}</p>
                        <p className="text-sm opacity-70">
                          {b.donorName} · {b.donorPhone || b.userEmail}
                        </p>
                        {b.preferredDate && (
                          <p className="text-sm">Date: {b.preferredDate} {b.preferredSlot}</p>
                        )}
                        {b.notes && <p className="text-sm mt-1">{b.notes}</p>}
                      </div>
                      <select
                        value={b.status}
                        onChange={async (e) => {
                          await updateBookingStatus(b._id, e.target.value as TempleBooking['status']);
                          load();
                        }}
                        className={`px-2 py-1 rounded border text-sm ${
                          isDark ? 'bg-black/30 border-white/10' : ''
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
