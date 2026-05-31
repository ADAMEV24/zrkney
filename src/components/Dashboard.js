'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, LogOut, Search, Users, TrendingUp, Calendar, BarChart2, Zap } from 'lucide-react';
import ComparisonCard from './ComparisonCard';

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#a78bfa', '#fb923c'];
const cats = ['عام', 'طعام', 'فواتير', 'إيجار', 'طوارئ', 'ترفيه', 'نقل'];

/* ── Category icons ─────────────────────────────────── */
const catIcon = {
  طعام: '🍔', فواتير: '📄', إيجار: '🏠',
  طوارئ: '🚨', ترفيه: '🎮', نقل: '🚗', عام: '💰',
};

/* ── Live Clock ──────────────────────────────────────── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return (
    <div style={{
      fontSize: '0.7rem',
      color: 'rgba(255,255,255,0.3)',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
    }}>
      <Calendar size={12} style={{ opacity: 0.6 }} />
      {dateStr}
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────── */
export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([]);
  const [profiles, setProfiles]         = useState({});
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [amount, setAmount]             = useState('');
  const [currency, setCurrency]         = useState('SYP');
  const [category, setCategory]         = useState('عام');
  const [reason, setReason]             = useState('');
  const [paymentDate, setPaymentDate]   = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting]     = useState(false);
  const [timeFilter, setTimeFilter]     = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [showCompare, setShowCompare]   = useState(false);
  const [chartCurrency, setChartCurrency] = useState('USD');

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('profiles').select('*');
      const map = {};
      pData?.forEach(p => { map[p.id] = p.name; });
      setProfiles(map);
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      setTransactions(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getFiltered = () => {
    let f = [...transactions];
    if (timeFilter !== 'all') {
      const d = new Date();
      if (timeFilter === 'week')  d.setDate(d.getDate() - 7);
      if (timeFilter === 'month') d.setMonth(d.getMonth() - 1);
      f = f.filter(t => new Date(t.payment_date) >= d);
    }
    if (personFilter !== 'all') {
      f = f.filter(t => t.payer_id === personFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(t =>
        (profiles[t.payer_id] || '').toLowerCase().includes(q) ||
        (t.reason || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    return f;
  };

  const filteredTrans = getFiltered();

  const calcTotals = (uid = null, data = filteredTrans) => {
    const s = uid ? data.filter(t => t.payer_id === uid) : data;
    return {
      usd: s.filter(t => t.currency === 'USD').reduce((a, t) => a + Number(t.amount), 0),
      syp: s.filter(t => t.currency === 'SYP').reduce((a, t) => a + Number(t.amount), 0),
    };
  };

  const myTotals       = calcTotals(session.user.id);
  const filteredTotals = calcTotals();

  const totalUSD_all = Math.max(Object.keys(profiles).reduce((a, id) => a + calcTotals(id).usd, 0), 0.01);
  const totalSYP_all = Math.max(Object.keys(profiles).reduce((a, id) => a + calcTotals(id).syp, 0), 0.01);

  /* ── Category Breakdown ── */
  const categoryTotals = {};
  filteredTrans.forEach(t => {
    const cat = t.category || 'عام';
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { total: { usd: 0, syp: 0 }, users: {} };
      Object.keys(profiles).forEach(uid => categoryTotals[cat].users[uid] = { usd: 0, syp: 0 });
    }
    const c = t.currency === 'USD' ? 'usd' : 'syp';
    categoryTotals[cat].total[c] += Number(t.amount);
    if (categoryTotals[cat].users[t.payer_id]) {
      categoryTotals[cat].users[t.payer_id][c] += Number(t.amount);
    }
  });

  /* ── Build Daily Chart ── */
  const buildDailyChartMulti = (cur) => {
    const userIds = Object.keys(profiles);
    // Collect all unique dates across all users
    const allDates = [...new Set(
      filteredTrans.filter(t => t.currency === cur).map(t => t.payment_date)
    )].sort();

    if (allDates.length === 0) return { allDates, userSeries: [], maxV: 1 };

    const W = 500, H = 160;

    // Build per-user daily totals
    const userSeries = userIds.map((uid, idx) => {
      const map = {};
      filteredTrans
        .filter(t => t.payer_id === uid && t.currency === cur)
        .forEach(t => { map[t.payment_date] = (map[t.payment_date] || 0) + Number(t.amount); });

      const values = allDates.map(d => map[d] || 0);
      return { uid, name: profiles[uid] || '؟', values, color: COLORS[idx % COLORS.length] };
    }).filter(s => s.values.some(v => v > 0));

    const maxV = Math.max(...userSeries.flatMap(s => s.values), 1);

    // Build SVG path per user
    const buildPath = (values) => {
      const pts = allDates.map((d, i) => ({
        x: allDates.length < 2 ? W / 2 : (i / (allDates.length - 1)) * W,
        y: H - (values[i] / maxV) * H,
        v: values[i], d,
      }));
      let line = '', area = '';
      if (pts.length > 0) {
        line = `M ${pts[0].x} ${pts[0].y}`;
        area = `M ${pts[0].x} ${H} L ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
          const cx = pts[i].x + (pts[i + 1].x - pts[i].x) / 2;
          const seg = ` C ${cx} ${pts[i].y}, ${cx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
          line += seg; area += seg;
        }
        area += ` L ${pts[pts.length - 1].x} ${H} Z`;
      }
      return { pts, line, area };
    };

    const seriesWithPaths = userSeries.map(s => ({ ...s, ...buildPath(s.values) }));
    return { allDates, userSeries: seriesWithPaths, maxV };
  };

  /* ── Submit Transaction ── */
  const handleSubmit = async () => {
    if (!window.confirm('هل أنت متأكد؟ العملية نهائية ولا يمكن تعديلها.')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert([{
        payer_id: session.user.id, amount: parseFloat(amount),
        currency, category, reason, payment_date: paymentDate,
      }]);
      if (error) throw error;
      setShowModal(false);
      setAmount(''); setReason('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      fetchData();
    } catch (e) { alert('خطأ: ' + e.message); }
    finally { setSubmitting(false); }
  };

  /* ────────────────────────── RENDER ────────────────────── */
  return (
    <div className="container animate-fade-in" style={{ direction: 'rtl' }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--font-4xl)',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #fff 15%, var(--primary-light) 50%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
          }}>
            زركني
          </h1>
          <LiveClock />
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', top: '50%', right: '12px',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.28)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '170px', paddingRight: '38px', paddingLeft: '12px', fontSize: '0.85rem', padding: '10px 38px 10px 12px' }}
            />
          </div>

          {/* Time Filter */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '4px',
            borderRadius: '12px',
            display: 'flex',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[['all', 'الكل'], ['month', 'شهر'], ['week', 'أسبوع']].map(([f, l]) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`filter-tab${timeFilter === f ? ' active' : ''}`}
              >{l}</button>
            ))}
          </div>

          {/* Compare Toggle */}
          <button
            onClick={() => setShowCompare(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '10px 15px',
              borderRadius: '12px',
              border: `1px solid ${showCompare ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: showCompare ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
              color: showCompare ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
              fontFamily: 'Cairo, sans-serif',
              fontWeight: '700',
              fontSize: '0.83rem',
              transition: 'all 0.25s',
            }}
          >
            <BarChart2 size={15} /> مقارنة
          </button>

          {/* Add button */}
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '10px 18px' }}
          >
            <Plus size={16} /> إضافة
          </button>

          {/* Sign Out */}
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: 'var(--danger)',
              padding: '10px 13px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.25s',
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ══ COMPARISON CARD (always visible) ══ */}
      <ComparisonCard profiles={profiles} transactions={filteredTrans} />

      {/* ══ STAT CARDS ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: '1.4rem',
        marginBottom: '2rem',
      }}>
        {/* My Contributions */}
        <div className="glass-panel stat-card" style={{
          padding: '1.8rem',
          borderTop: '3px solid var(--success)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, transparent 65%)',
        }}>
          <div className="glow-orb" style={{ width: '130px', height: '130px', background: 'var(--success)', opacity: 0.1, top: '-40px', right: '-30px' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)', display: 'inline-block' }} />
              مساهماتي
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
              {myTotals.usd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: '800', letterSpacing: '0.1em', marginTop: '2px', marginBottom: '0.9rem' }}>دولار USD</div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(16,185,129,0.25), transparent)', marginBottom: '0.9rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>{myTotals.syp.toLocaleString()}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' }}>ليرة سورية SYP</div>
          </div>
        </div>

        {/* Shared Fund */}
        <div className="glass-panel stat-card" style={{
          padding: '1.8rem',
          borderTop: '3px solid var(--primary)',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, transparent 65%)',
        }}>
          <div className="glow-orb" style={{ width: '130px', height: '130px', background: 'var(--primary)', opacity: 0.1, top: '-40px', left: '-30px', animationDelay: '6s' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)', display: 'inline-block' }} />
              الصندوق المشترك
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
              {filteredTotals.usd.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.1em', marginTop: '2px', marginBottom: '0.9rem' }}>دولار USD</div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(124,58,237,0.25), transparent)', marginBottom: '0.9rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>{filteredTotals.syp.toLocaleString()}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' }}>ليرة سورية SYP</div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="glass-panel stat-card" style={{
          padding: '1.8rem',
          borderTop: '3px solid var(--secondary)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, transparent 65%)',
        }}>
          <div className="glow-orb" style={{ width: '130px', height: '130px', background: 'var(--secondary)', opacity: 0.08, top: '-40px', right: '-30px', animationDelay: '3s' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 10px var(--secondary)', display: 'inline-block' }} />
              إجمالي العمليات
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
              {filteredTrans.length}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--secondary)', fontWeight: '800', letterSpacing: '0.1em', marginTop: '2px', marginBottom: '0.9rem' }}>معاملة مسجّلة</div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(6,182,212,0.25), transparent)', marginBottom: '0.9rem' }} />
            {filteredTrans.length > 0 && (
              <>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                  آخر عملية: {filteredTrans[0]?.payment_date || '—'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: '600', marginTop: '4px' }}>
                  {profiles[filteredTrans[0]?.payer_id] || '—'} · {filteredTrans[0]?.category || 'عام'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ CATEGORY BREAKDOWN ══ */}
      {Object.keys(categoryTotals).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
            <span className="section-title">تفصيل التصنيفات</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.2rem'
          }}>
            {Object.entries(categoryTotals).map(([cat, data], idx) => {
              const color = COLORS[idx % COLORS.length];
              return (
                <div key={cat} className="glass-panel stat-card" style={{
                  padding: '1.5rem',
                  borderTop: `3px solid ${color}`,
                  background: `linear-gradient(135deg, ${color}11 0%, transparent 65%)`,
                }}>
                  <div style={{
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800',
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, display: 'inline-block' }} />
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1.2rem' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
                      {data.total.usd.toFixed(2)} <span style={{fontSize:'0.65rem', color:color, fontWeight: '800'}}>USD</span>
                    </div>
                    {data.total.syp > 0 && (
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>
                        {data.total.syp.toLocaleString()} <span style={{fontSize:'0.6rem'}}>SYP</span>
                      </div>
                    )}
                  </div>
                  <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}33, transparent)`, marginBottom: '1rem' }} />
                  
                  {/* Users breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(data.users).map(([uid, uData]) => {
                       if (uData.usd === 0 && uData.syp === 0) return null;
                       return (
                         <div key={uid} style={{ 
                           display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                           background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.8rem', borderRadius: '8px',
                           border: '1px solid rgba(255,255,255,0.02)'
                         }}>
                           <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>{profiles[uid]}</span>
                           <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                              {uData.usd > 0 && <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white' }}>{uData.usd.toFixed(2)} <span style={{fontSize:'0.55rem', color:color}}>USD</span></span>}
                              {uData.syp > 0 && <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.45)' }}>{uData.syp.toLocaleString()} <span style={{fontSize:'0.5rem'}}>SYP</span></span>}
                           </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ DAILY LINE CHART — per user ══ */}
      {(() => {
        const { allDates, userSeries, maxV } = buildDailyChartMulti(chartCurrency);
        const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({ pct: p, val: maxV * p }));
        const hasData = userSeries.length > 0;
        return (
          <div className="glass-panel" style={{ padding: '1.8rem', marginBottom: '2rem', background: 'rgba(6,8,18,0.92)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <TrendingUp size={18} color="#7c3aed" />
                <span className="section-title">المدفوعات اليومية</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                {[['USD', '$ دولار'], ['SYP', 'ل.س ليرة']].map(([c, l]) => (
                  <button key={c} onClick={() => setChartCurrency(c)} className={`filter-tab${chartCurrency === c ? ' active' : ''}`}>{l}</button>
                ))}
              </div>
            </div>

            {/* Legend */}
            {hasData && (
              <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                {userSeries.map(s => (
                  <div key={s.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '3px', borderRadius: '2px', background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>{s.name}</span>
                  </div>
                ))}
              </div>
            )}

            {!hasData ? (
              <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '2rem', opacity: 0.18 }}>📉</div>
                <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.85rem', fontWeight: '700' }}>
                  لا توجد مدفوعات {chartCurrency === 'USD' ? 'بالدولار' : 'بالليرة'} لهذه الفترة
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', padding: '10px 10px 36px 52px' }}>
                {/* Y-axis labels */}
                <div style={{ position: 'absolute', left: 0, top: '10px', bottom: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '48px', textAlign: 'left' }}>
                  {[...yTicks].reverse().map((t, i) => (
                    <span key={i} style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.22)', fontWeight: '700' }}>
                      {t.val >= 1000 ? (t.val / 1000).toFixed(0) + 'k' : t.val.toFixed(t.val < 10 ? 1 : 0)}
                    </span>
                  ))}
                </div>

                <svg width="100%" viewBox="0 0 500 160" preserveAspectRatio="none" style={{ overflow: 'visible', display: 'block' }}>
                  <defs>
                    {userSeries.map(s => (
                      <linearGradient key={s.uid} id={`grad-${s.uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Grid lines */}
                  {yTicks.map((t, i) => (
                    <line key={i} x1="0" y1={160 - t.pct * 160} x2="500" y2={160 - t.pct * 160}
                      stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="6 4" />
                  ))}

                  {/* Per-user area fills (draw first, behind lines) */}
                  {userSeries.map(s => s.area && (
                    <path key={`area-${s.uid}`} d={s.area} fill={`url(#grad-${s.uid})`} />
                  ))}

                  {/* Per-user lines */}
                  {userSeries.map(s => s.line && (
                    <g key={`line-${s.uid}`}>
                      {/* Glow */}
                      <path d={s.line} fill="none" stroke={s.color} strokeWidth="6" strokeLinecap="round" opacity="0.07" />
                      {/* Main line */}
                      <path d={s.line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
                    </g>
                  ))}

                  {/* Per-user dots */}
                  {userSeries.map(s =>
                    s.pts.map((p, i) => p.v > 0 && (
                      <g key={`dot-${s.uid}-${i}`}>
                        <circle cx={p.x} cy={p.y} r="6" fill={s.color} opacity="0.12" />
                        <circle cx={p.x} cy={p.y} r="3" fill={s.color} opacity="0.7" />
                        <circle cx={p.x} cy={p.y} r="1.8" fill={s.color} stroke="rgba(6,8,18,0.95)" strokeWidth="1.2" />
                      </g>
                    ))
                  )}
                </svg>

                {/* X-axis labels */}
                <div style={{ position: 'absolute', bottom: 0, left: '52px', right: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  {allDates.map((d, i) => (
                    <span key={i} style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontWeight: '700', textAlign: 'center' }}>
                      {new Date(d).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ COMPARISON TABLE (toggle) ══ */}
      {showCompare && (() => {
        const userIds = Object.keys(profiles);
        const catUSD = cats.map(cat => {
          const row = { cat };
          userIds.forEach(id => {
            const s = filteredTrans.filter(t => t.payer_id === id && (t.category || 'عام') === cat && t.currency === 'USD');
            row[id] = s.reduce((a, t) => a + Number(t.amount), 0);
          });
          row._max = Math.max(...userIds.map(id => row[id]), 0.01);
          return row;
        }).filter(r => userIds.some(id => r[id] > 0));

        const catSYP = cats.map(cat => {
          const row = { cat };
          userIds.forEach(id => {
            const s = filteredTrans.filter(t => t.payer_id === id && (t.category || 'عام') === cat && t.currency === 'SYP');
            row[id] = s.reduce((a, t) => a + Number(t.amount), 0);
          });
          row._max = Math.max(...userIds.map(id => row[id]), 0.01);
          return row;
        }).filter(r => userIds.some(id => r[id] > 0));

        const rankedUSD = userIds.map(id => ({ id, total: calcTotals(id).usd })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
        const maxUSD    = rankedUSD[0]?.total || 1;
        const rankedSYP = userIds.map(id => ({ id, total: calcTotals(id).syp })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);
        const maxSYP    = rankedSYP[0]?.total || 1;

        return (
          <div className="glass-panel animate-fade-in" style={{ padding: '1.8rem', marginBottom: '2rem', background: 'rgba(8,10,22,0.75)', border: '1px solid rgba(245,158,11,0.14)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.6rem' }}>
              <BarChart2 size={18} color="var(--accent)" />
              <span className="section-title">مقارنة الأعضاء</span>
              <span style={{ marginRight: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase' }}>USD · SYP منفصلان</span>
            </div>

            {rankedUSD.length > 0 && (
              <div style={{ marginBottom: '1.4rem' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--success)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem' }}>ترتيب الدولار USD</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {rankedUSD.map((r, i) => {
                    const pct  = (r.total / maxUSD) * 100;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                    return (
                      <div key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{medal}</span>
                            <span style={{ fontWeight: '800', color: '#f1f5f9', fontSize: '0.88rem' }}>{profiles[r.id]}</span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--success)' }}>${r.total.toFixed(2)}</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--success), #34d399)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {rankedSYP.length > 0 && (
              <div>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)', marginBottom: '1.1rem' }} />
                <div style={{ fontSize: '0.66rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem' }}>ترتيب الليرة SYP</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {rankedSYP.map((r, i) => {
                    const pct  = (r.total / maxSYP) * 100;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                    return (
                      <div key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{medal}</span>
                            <span style={{ fontWeight: '800', color: '#f1f5f9', fontSize: '0.88rem' }}>{profiles[r.id]}</span>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary-light)' }}>{r.total.toLocaleString()} ل.س</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {catUSD.length > 0 && (
              <>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)', margin: '1.2rem 0 1rem' }} />
                <div style={{ fontSize: '0.66rem', color: 'var(--success)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem' }}>تفصيل الفئات · دولار USD</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'right', minWidth: '380px' }}>
                    <thead>
                      <tr style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.28)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ padding: '0.3rem 0.8rem' }}>الفئة</th>
                        {userIds.map((id, i) => <th key={id} style={{ padding: '0.3rem 0.8rem', color: COLORS[i % COLORS.length] }}>{profiles[id]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {catUSD.map(row => (
                        <tr key={row.cat}>
                          <td style={{ padding: '0.55rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px 0 0 8px', fontWeight: '700', color: '#e2e8f8', fontSize: '0.82rem' }}>
                            {catIcon[row.cat] || '💰'} {row.cat}
                          </td>
                          {userIds.map((id, i) => {
                            const val = row[id];
                            const pct = (val / row._max) * 100;
                            const isMax = val === row._max && val > 0;
                            return (
                              <td key={id} style={{ padding: '0.55rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: i === userIds.length - 1 ? '0 8px 8px 0' : '0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isMax ? 'var(--success)' : 'rgba(255,255,255,0.38)' }}>
                                    {val > 0 ? `$${val.toFixed(2)}` : '—'}
                                  </span>
                                  {val > 0 && (
                                    <div className="progress-bar-track" style={{ height: '3px' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: 'var(--success)', opacity: isMax ? 1 : 0.35 }} />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {catSYP.length > 0 && (
              <>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)', margin: '1.2rem 0 1rem' }} />
                <div style={{ fontSize: '0.66rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem' }}>تفصيل الفئات · ليرة سورية SYP</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'right', minWidth: '380px' }}>
                    <thead>
                      <tr style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.28)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ padding: '0.3rem 0.8rem' }}>الفئة</th>
                        {userIds.map((id, i) => <th key={id} style={{ padding: '0.3rem 0.8rem', color: COLORS[i % COLORS.length] }}>{profiles[id]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {catSYP.map(row => (
                        <tr key={row.cat}>
                          <td style={{ padding: '0.55rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px 0 0 8px', fontWeight: '700', color: '#e2e8f8', fontSize: '0.82rem' }}>
                            {catIcon[row.cat] || '💰'} {row.cat}
                          </td>
                          {userIds.map((id, i) => {
                            const val = row[id];
                            const pct = (val / row._max) * 100;
                            const isMax = val === row._max && val > 0;
                            const c = COLORS[i % COLORS.length];
                            return (
                              <td key={id} style={{ padding: '0.55rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: i === userIds.length - 1 ? '0 8px 8px 0' : '0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isMax ? c : 'rgba(255,255,255,0.38)' }}>
                                    {val > 0 ? val.toLocaleString() + ' ل.س' : '—'}
                                  </span>
                                  {val > 0 && (
                                    <div className="progress-bar-track" style={{ height: '3px' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: c, opacity: isMax ? 1 : 0.35 }} />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* ══ MEMBER PAYMENTS ══ */}
      <div className="glass-panel" style={{ padding: '1.8rem', marginBottom: '2rem', background: 'rgba(6,8,18,0.92)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.6rem' }}>
          <Users size={18} color="var(--primary-light)" />
          <span className="section-title">ملخص مدفوعات الأعضاء</span>
          <span style={{ marginRight: 'auto', fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>USD · SYP منفصلان</span>
        </div>

        {Object.keys(profiles).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.18)' }}>لا يوجد أعضاء</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {Object.keys(profiles).map((uid, uidIdx) => {
              const memberTrans = filteredTrans.filter(t => t.payer_id === uid);
              const totalUSD = memberTrans.filter(t => t.currency === 'USD').reduce((a, t) => a + Number(t.amount), 0);
              const totalSYP = memberTrans.filter(t => t.currency === 'SYP').reduce((a, t) => a + Number(t.amount), 0);
              const color = COLORS[uidIdx % COLORS.length];
              return (
                <div key={uid} style={{ borderRadius: '16px', border: `1px solid ${color}22`, overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ padding: '1rem 1.3rem', background: `linear-gradient(135deg, ${color}10, rgba(6,8,18,0.6))`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `linear-gradient(135deg, ${color}, ${color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem', color: 'white', boxShadow: `0 4px 14px ${color}44`, flexShrink: 0 }}>
                        {(profiles[uid] || '?').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: '#f1f5f9', fontSize: '0.95rem' }}>{profiles[uid]}</div>
                        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.28)', fontWeight: '700', marginTop: '1px' }}>{memberTrans.length} معاملة</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.7rem' }}>
                      <div style={{ padding: '0.45rem 0.9rem', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--success)', lineHeight: 1 }}>${totalUSD.toFixed(2)}</div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(16,185,129,0.6)', fontWeight: '800', marginTop: '2px', letterSpacing: '0.08em' }}>USD</div>
                      </div>
                      <div style={{ padding: '0.45rem 0.9rem', borderRadius: '10px', background: `${color}10`, border: `1px solid ${color}28`, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: '900', color: color, lineHeight: 1 }}>{totalSYP.toLocaleString()}</div>
                        <div style={{ fontSize: '0.58rem', color: `${color}99`, fontWeight: '800', marginTop: '2px', letterSpacing: '0.08em' }}>ل.س SYP</div>
                      </div>
                    </div>
                  </div>
                  {memberTrans.length > 0 && (
                    <div style={{ padding: '0.5rem' }}>
                      {memberTrans.map(t => (
                        <div key={t.id} className="tx-row" style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.6rem 0.85rem', borderRadius: '10px', marginBottom: '3px',
                          background: 'rgba(255,255,255,0.012)', border: '1px solid transparent',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.22)', fontWeight: '700', minWidth: '78px' }}>{t.payment_date}</span>
                            <span style={{ fontSize: '0.62rem', background: `${color}16`, color, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${color}28`, fontWeight: '700' }}>
                              {catIcon[t.category || 'عام'] || '💰'} {t.category || 'عام'}
                            </span>
                            {t.reason && <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.36)' }}>{t.reason}</span>}
                          </div>
                          <div style={{ fontWeight: '900', fontSize: '0.95rem', color: t.currency === 'USD' ? 'var(--success)' : color, whiteSpace: 'nowrap' }}>
                            {t.currency === 'SYP' ? Number(t.amount).toLocaleString() : Number(t.amount).toFixed(2)}
                            <span style={{ fontSize: '0.58rem', marginRight: '3px', opacity: 0.5, fontWeight: '700' }}>{t.currency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {memberTrans.length === 0 && (
                    <div style={{ padding: '1.1rem', textAlign: 'center', color: 'rgba(255,255,255,0.16)', fontSize: '0.8rem' }}>لا توجد معاملات في هذه الفترة</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ DONUT + TABLE ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.4rem', marginBottom: '2rem' }}>
        {/* Donut */}
        <div className="glass-panel" style={{ padding: '1.8rem', background: 'rgba(8,10,22,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.4rem' }}>
            <Users size={18} color="var(--primary-light)" />
            <span className="section-title">توزيع المساهمات</span>
          </div>
          {/* USD donut */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--success)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem', textAlign: 'center' }}>توزيع الدولار USD</div>
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <svg width="140" height="140" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                {(() => { let off = 0; return Object.keys(profiles).map((id, idx) => { const val = calcTotals(id).usd; const pct = (val / totalUSD_all) * 100; if (pct <= 0) return null; const da = `${pct - 1.5} ${101.5 - pct}`, dOff = 100 - off + 25; off += pct; return <circle key={id} cx="21" cy="21" r="15.9155" fill="transparent" stroke={COLORS[idx % COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeDasharray={da} strokeDashoffset={dOff} style={{ transition: 'all 1.2s ease', filter: `drop-shadow(0 0 5px ${COLORS[idx % COLORS.length]}55)` }} />; }); })()}
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.28)', fontWeight: '800' }}>USD</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '900', color: 'white' }}>${filteredTotals.usd.toFixed(0)}</div>
              </div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', marginBottom: '1.1rem' }} />
          {/* SYP donut */}
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.7rem', textAlign: 'center' }}>توزيع الليرة SYP</div>
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <svg width="140" height="140" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                {(() => { let off = 0; return Object.keys(profiles).map((id, idx) => { const val = calcTotals(id).syp; const pct = (val / totalSYP_all) * 100; if (pct <= 0) return null; const da = `${pct - 1.5} ${101.5 - pct}`, dOff = 100 - off + 25; off += pct; return <circle key={id} cx="21" cy="21" r="15.9155" fill="transparent" stroke={COLORS[idx % COLORS.length]} strokeWidth="4" strokeLinecap="round" strokeDasharray={da} strokeDashoffset={dOff} style={{ transition: 'all 1.2s ease', filter: `drop-shadow(0 0 5px ${COLORS[idx % COLORS.length]}55)` }} />; }); })()}
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.28)', fontWeight: '800' }}>ل.س</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'white' }}>{filteredTotals.syp.toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginTop: '0.9rem' }}>
            {Object.keys(profiles).map((id, i) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.55rem', borderRadius: '8px', background: 'rgba(255,255,255,0.025)' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}88`, flexShrink: 0 }} />
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.52)', fontWeight: '600' }}>{profiles[id]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Members table */}
        <div className="glass-panel" style={{ padding: '1.8rem', background: 'rgba(8,10,22,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.4rem' }}>
            <Zap size={18} color="var(--secondary)" />
            <span className="section-title">مساهمات الأعضاء</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'right' }}>
            <thead>
              <tr style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <th style={{ padding: '0 0.8rem 0.5rem' }}>العضو</th>
                <th style={{ padding: '0 0.8rem 0.5rem' }}>USD</th>
                <th style={{ padding: '0 0.8rem 0.5rem' }}>SYP</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(profiles).map((id, i) => {
                const t = calcTotals(id);
                return (
                  <tr key={id}>
                    <td style={{ padding: '0.85rem 0.8rem', background: 'rgba(255,255,255,0.022)', borderRadius: '10px 0 0 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}`, flexShrink: 0 }} />
                        <span style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.88rem' }}>{profiles[id]}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.8rem', background: 'rgba(255,255,255,0.022)', color: 'var(--success)', fontWeight: '800', fontSize: '0.92rem' }}>
                      ${t.usd.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 0.8rem', background: 'rgba(255,255,255,0.022)', borderRadius: '0 10px 10px 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: '600' }}>
                      {t.syp.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ TRANSACTIONS LIST ══ */}
      <div className="glass-panel" style={{ padding: '1.8rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,10,22,0.7)', marginBottom: '2rem' }}>
        {/* Header with person filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.6rem', flexWrap: 'wrap' }}>
          <Calendar size={18} color="var(--primary-light)" />
          <span className="section-title">سجل المعاملات</span>
          <span style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--primary-light)', fontSize: '0.7rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.22)' }}>
            {filteredTrans.length} معاملة
          </span>

          {/* Person filter */}
          <div style={{ marginRight: 'auto', display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setPersonFilter('all')}
              className={`filter-tab${personFilter === 'all' ? ' active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >الكل</button>
            {Object.keys(profiles).map((id, i) => (
              <button
                key={id}
                onClick={() => setPersonFilter(id)}
                className={`filter-tab${personFilter === id ? ' active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
              >{profiles[id]}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loader" style={{ margin: '0 auto' }} />
            <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.28)', fontSize: '0.83rem' }}>جاري التحميل...</div>
          </div>
        ) : filteredTrans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.18)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
            لا توجد معاملات في هذه الفترة
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredTrans.map((t, idx) => {
              const nameInitial = (profiles[t.payer_id] || '?').charAt(0);
              const colorIdx    = Object.keys(profiles).indexOf(t.payer_id);
              const color       = COLORS[colorIdx % COLORS.length] || COLORS[0];
              return (
                <div key={t.id} className="tx-row" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.9rem 1.1rem',
                  background: 'rgba(255,255,255,0.018)',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.04)',
                  animationDelay: `${idx * 0.035}s`,
                }}>
                  {/* Left: Avatar + info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    {/* Timeline dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: `linear-gradient(135deg, ${color}cc, ${color}55)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '900', fontSize: '1rem', color: 'white', flexShrink: 0,
                        boxShadow: `0 4px 14px ${color}33`,
                      }}>
                        {nameInitial}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.92rem' }}>{profiles[t.payer_id] || 'مجهول'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.63rem', background: `${color}14`, color, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${color}28`, fontWeight: '700' }}>
                          {catIcon[t.category || 'عام'] || '💰'} {t.category || 'عام'}
                        </span>
                        {t.reason && <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)' }}>{t.reason}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Right: Amount + date */}
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontWeight: '900', color: t.currency === 'USD' ? 'var(--success)' : 'rgba(255,255,255,0.88)', fontSize: '1.05rem' }}>
                      {t.currency === 'SYP' ? Number(t.amount).toLocaleString() : Number(t.amount).toFixed(2)}
                      <span style={{ fontSize: '0.62rem', marginRight: '4px', opacity: 0.55, fontWeight: '600' }}>{t.currency}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.22)', marginTop: '2px', fontWeight: '600' }}>{t.payment_date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ MODAL ══ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel animate-scale-in" style={{
            padding: '2.2rem',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid rgba(124,58,237,0.22)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 60px rgba(124,58,237,0.06)',
          }}>
            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--primary-dark), var(--secondary-dark))',
                boxShadow: '0 8px 24px var(--primary-glow)',
                fontSize: '1.4rem', marginBottom: '0.8rem',
              }}>➕</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>معاملة جديدة</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'white' }}>إضافة معاملة مالية</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.4rem' }}>
              {/* Amount + Currency */}
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={modalLabelStyle}>المبلغ</label>
                  <input type="number" step="0.01" className="input-field" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ fontSize: '1.15rem', fontWeight: '800' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabelStyle}>العملة</label>
                  <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="SYP">ل.س</option>
                    <option value="USD">USD $</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={modalLabelStyle}>التصنيف</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {cats.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '6px 13px',
                        borderRadius: '8px',
                        border: `1px solid ${category === cat ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}`,
                        background: category === cat ? 'rgba(124,58,237,0.2)' : 'transparent',
                        color: category === cat ? 'var(--primary-light)' : 'rgba(255,255,255,0.48)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        fontFamily: 'Cairo, sans-serif',
                        transition: 'all 0.2s',
                      }}
                    >
                      {catIcon[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label style={modalLabelStyle}>سبب الدفع</label>
                <input type="text" className="input-field" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: فاتورة كهرباء..." />
              </div>

              {/* Date */}
              <div>
                <label style={modalLabelStyle}>التاريخ</label>
                <input type="date" className="input-field" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
            </div>

            {/* Warning */}
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.4rem' }}>
              <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                ⚠️ <strong style={{ color: 'var(--danger)' }}>تنبيه:</strong> هذه العملية نهائية ولا يمكن تعديلها أو حذفها بعد الحفظ.
              </p>
            </div>

            {/* Preview */}
            {amount && reason && (
              <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--primary-light)', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>معاينة العملية</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                    {catIcon[category]} {category} · {reason}
                  </div>
                  <div style={{ fontWeight: '900', color: currency === 'USD' ? 'var(--success)' : 'var(--primary-light)', fontSize: '1rem' }}>
                    {currency === 'SYP' ? Number(amount).toLocaleString() : Number(amount).toFixed(2)} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{currency}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                style={{ flex: 2, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleSubmit}
                disabled={!amount || !reason || submitting}
              >
                {submitting ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    جاري الحفظ...
                  </>
                ) : '✓ تأكيد الحفظ النهائي'}
              </button>
              <button
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', transition: 'all 0.2s', fontSize: '0.9rem' }}
                onClick={() => setShowModal(false)}
                disabled={submitting}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const modalLabelStyle = {
  display: 'block',
  marginBottom: '0.42rem',
  fontSize: '0.72rem',
  color: 'rgba(255,255,255,0.38)',
  fontWeight: '700',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};
