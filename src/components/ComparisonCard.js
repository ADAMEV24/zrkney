'use client';
import { useState, useEffect, useRef } from 'react';

/* ── Animated Number Counter ─────────────────────────── */
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 2 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const duration = 1400;

  useEffect(() => {
    const target = Number(value) || 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('ar-SA');

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

/* ── Progress Bar ─────────────────────────────────────── */
function DualProgressBar({ pctA, pctB, colorA, colorB }) {
  return (
    <div style={{
      display: 'flex',
      height: '10px',
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.05)',
      gap: '2px',
    }}>
      <div style={{
        width: `${pctA}%`,
        background: `linear-gradient(90deg, ${colorA}cc, ${colorA})`,
        borderRadius: '10px 0 0 10px',
        boxShadow: `0 0 12px ${colorA}66`,
        animation: 'progressFill 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shimmerSlide 2s ease-in-out infinite',
        }}/>
      </div>
      <div style={{
        width: `${pctB}%`,
        background: `linear-gradient(90deg, ${colorB}, ${colorB}cc)`,
        borderRadius: '0 10px 10px 0',
        boxShadow: `0 0 12px ${colorB}66`,
        animation: 'progressFill 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}/>
    </div>
  );
}

/* ── Main ComparisonCard ──────────────────────────────── */
export default function ComparisonCard({ profiles, transactions }) {
  const COLOR_A = '#7c3aed'; // حسان — بنفسجي
  const COLOR_B = '#06b6d4'; // كعكة — سماوي

  const userIds = Object.keys(profiles);
  if (userIds.length < 2) return null;

  // Calculate USD totals per user
  const getTotalsUSD = (uid) =>
    transactions
      .filter(t => t.payer_id === uid && t.currency === 'USD')
      .reduce((acc, t) => acc + Number(t.amount), 0);

  const getTotalsSYP = (uid) =>
    transactions
      .filter(t => t.payer_id === uid && t.currency === 'SYP')
      .reduce((acc, t) => acc + Number(t.amount), 0);

  const getCount = (uid) => transactions.filter(t => t.payer_id === uid).length;

  // Sort by USD desc to determine leader
  const sorted = userIds
    .map(id => ({
      id,
      name: profiles[id] || '؟',
      usd: getTotalsUSD(id),
      syp: getTotalsSYP(id),
      count: getCount(id),
    }))
    .sort((a, b) => b.usd - a.usd);

  const playerA = sorted[0];
  const playerB = sorted[1];

  const totalUSD = playerA.usd + playerB.usd || 0.01;
  const pctA = Math.round((playerA.usd / totalUSD) * 100);
  const pctB = 100 - pctA;

  const diff = playerA.usd - playerB.usd;
  const tied = diff < 0.005;

  // Dynamic battle message
  let battleMsg = '';
  let battleColor = '#f59e0b';
  if (tied) {
    battleMsg = '⚖️ تعادل تام! الحساب متوازن بالكامل';
    battleColor = '#10b981';
  } else if (diff < 5) {
    battleMsg = `🔥 ${playerA.name} يتقدم بفارق ضئيل $${diff.toFixed(2)}!`;
  } else if (diff < 20) {
    battleMsg = `⚡ ${playerA.name} يتفوق بـ $${diff.toFixed(2)} دولار!`;
  } else if (diff < 100) {
    battleMsg = `🚀 ${playerA.name} يتصدر المشهد بفارق $${diff.toFixed(2)}!`;
  } else {
    battleMsg = `👑 ${playerA.name} يسحق بفارق هائل $${diff.toFixed(2)} دولار!`;
    battleColor = '#7c3aed';
  }

  const colorA = playerA.id === sorted[0].id ? COLOR_A : COLOR_B;
  const colorB = playerB.id === sorted[0].id ? COLOR_A : COLOR_B;

  return (
    <div className="glass-panel comparison-card animate-fade-in"
      style={{ padding: '0', marginBottom: '2rem', overflow: 'hidden' }}>

      {/* ── Battle Arena ── */}
      <div style={{
        padding: '1.5rem 2rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '1.5rem',
        alignItems: 'center',
      }}>

        {/* Player A */}
        <PlayerCard
          player={playerA}
          color={COLOR_A}
          isLeader={true}
          pct={pctA}
          side="right"
        />

        {/* VS Divider */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div className="vs-badge" style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            animation: 'vsFlash 2.5s ease-in-out infinite',
            textShadow: '0 0 20px rgba(245,158,11,0.5)',
            display: 'block',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            border: '1px solid rgba(245,158,11,0.2)',
            background: 'rgba(245,158,11,0.05)',
          }}>VS</div>
        </div>

        {/* Player B */}
        <PlayerCard
          player={playerB}
          color={COLOR_B}
          isLeader={false}
          pct={pctB}
          side="left"
        />
      </div>

      {/* ── Dual Progress Bar ── */}
      <div style={{ padding: '0 2rem 0.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
          fontSize: '0.68rem',
          fontWeight: '700',
          color: 'rgba(255,255,255,0.35)',
        }}>
          <span style={{ color: COLOR_A }}>{pctA}%</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
            نسبة المساهمات
          </span>
          <span style={{ color: COLOR_B }}>{pctB}%</span>
        </div>
        <DualProgressBar pctA={pctA} pctB={pctB} colorA={COLOR_A} colorB={COLOR_B} />
      </div>

      {/* ── Battle Message ── */}
      <div style={{ padding: '1.2rem 2rem 1.5rem' }}>
        <div className="battle-message" style={{
          color: battleColor,
          border: `1px solid ${battleColor}25`,
          background: `${battleColor}08`,
          textShadow: `0 0 20px ${battleColor}44`,
        }}>
          {battleMsg}
        </div>
      </div>
    </div>
  );
}

/* ── Player Card Sub-component ───────────────────────── */
function PlayerCard({ player, color, isLeader, pct, side }) {
  const isRight = side === 'right';

  return (
    <div className="comparison-player-card" style={{
      background: `linear-gradient(${isRight ? '135deg' : '225deg'}, ${color}14 0%, rgba(10,12,28,0.4) 100%)`,
      border: `1px solid ${color}25`,
      textAlign: isRight ? 'right' : 'left',
    }}>
      {/* Crown for leader */}
      {isLeader && (
        <div style={{
          position: 'absolute',
          top: '-14px',
          [isRight ? 'right' : 'left']: '50%',
          transform: 'translateX(50%)',
          fontSize: '1.6rem',
          animation: 'crownBounce 2s ease-in-out infinite',
          filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.7))',
          zIndex: 10,
        }}>👑</div>
      )}

      {/* Avatar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        flexDirection: isRight ? 'row' : 'row-reverse',
        marginBottom: '1rem',
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          fontSize: '1.3rem',
          color: 'white',
          flexShrink: 0,
          boxShadow: `0 6px 20px ${color}55`,
        }}>
          {(player.name || '?').charAt(0)}
        </div>
        <div>
          <div style={{
            fontWeight: '800',
            color: '#f1f5f9',
            fontSize: '1rem',
            letterSpacing: '-0.01em',
          }}>{player.name}</div>
          <div style={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.35)',
            fontWeight: '700',
            marginTop: '2px',
          }}>
            {player.count} عملية
          </div>
        </div>
      </div>

      {/* USD Amount — big & bold */}
      <div style={{
        fontSize: '2rem',
        fontWeight: '900',
        color: 'white',
        lineHeight: 1,
        marginBottom: '0.25rem',
        letterSpacing: '-0.03em',
      }}>
        <AnimatedCounter value={player.usd} prefix="$" decimals={2} />
      </div>
      <div style={{
        fontSize: '0.65rem',
        color: color,
        fontWeight: '800',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '0.8rem',
        opacity: 0.85,
      }}>دولار أمريكي</div>

      {/* SYP small */}
      {player.syp > 0 && (
        <div style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: '700',
          padding: '3px 8px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '6px',
          display: 'inline-block',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <AnimatedCounter value={player.syp} decimals={0} /> ل.س
        </div>
      )}

      {/* Leader badge */}
      {isLeader && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          marginTop: '0.7rem',
          padding: '4px 10px',
          borderRadius: '20px',
          background: `${color}20`,
          border: `1px solid ${color}40`,
          fontSize: '0.68rem',
          fontWeight: '800',
          color: color,
          letterSpacing: '0.05em',
        }}>
          🏆 المتصدر
        </div>
      )}
    </div>
  );
}
