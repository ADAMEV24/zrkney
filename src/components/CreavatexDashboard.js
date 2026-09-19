'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, TrendingUp, FolderOpen, DollarSign, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';

/* ── Constants ─────────────────────────────────────── */
const ADMIN_EMAILS = ['adamevev101@gmail.com', 'hassandweedary@gmail.com', 'hilowpr35@gmail.com'];

const PROJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#a78bfa', '#fb923c', '#ec4899', '#14b8a6',
];

/* ── Helpers ────────────────────────────────────────── */
const fmt = (n, cur) =>
  cur === 'SYP'
    ? Number(n).toLocaleString('ar-SY') + ' ل.س'
    : '$' + Number(n).toFixed(2);

/* ── Summary Stat Card ──────────────────────────────── */
function StatCard({ color, icon: Icon, label, valueUSD, valueSYP, sub }) {
  return (
    <div
      className="glass-panel stat-card"
      style={{
        padding: '1.6rem',
        borderTop: `3px solid ${color}`,
        background: `linear-gradient(135deg, ${color}0f 0%, transparent 65%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="glow-orb"
        style={{ width: '110px', height: '110px', background: color, opacity: 0.09, top: '-35px', right: '-25px' }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', fontWeight: '800',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, display: 'inline-block' }} />
          {label}
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
          {valueUSD}
        </div>
        <div style={{ fontSize: '0.65rem', color, fontWeight: '800', letterSpacing: '0.1em', marginTop: '3px', marginBottom: '0.8rem' }}>
          دولار USD
        </div>
        <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}33, transparent)`, marginBottom: '0.8rem' }} />
        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'rgba(255,255,255,0.7)' }}>{valueSYP}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' }}>
          ليرة سورية SYP
        </div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.6rem', fontWeight: '600' }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Progress Bar ───────────────────────────────────── */
function ProgressBar({ pct, color, danger }) {
  const safeP = Math.min(pct, 100);
  const barColor = danger ? '#ef4444' : color;
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${safeP}%`,
        background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
        borderRadius: '6px',
        boxShadow: `0 0 8px ${barColor}55`,
        transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      }} />
    </div>
  );
}

/* ── Modal Overlay ──────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="glass-panel animate-scale-in"
        style={{
          padding: '2rem', width: '100%', maxWidth: '480px',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.07)',
          position: 'relative',
        }}
      >
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #7c3aed, #06b6d4, transparent)',
          borderRadius: '24px 24px 0 0',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.6rem' }}>
          <h3 style={{ fontWeight: '900', fontSize: '1.1rem', color: 'white', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: 'white',
  fontFamily: 'Cairo, sans-serif',
  fontSize: '0.92rem',
  outline: 'none',
};

const labelStyle = {
  display: 'block', marginBottom: '0.42rem',
  fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
  fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase',
};

/* ── Add Project Modal ──────────────────────────────── */
function AddProjectModal({ onClose, onSaved }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [budget, setBudget]     = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(null);

  const handleSave = async () => {
    if (!name.trim() || !budget) return;
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from('creavatex_projects').insert([{
        name: name.trim(), description: desc.trim() || null,
        budget: parseFloat(budget), currency,
      }]);
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="➕ مشروع جديد" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '0.7rem 1rem', borderRadius: '10px', fontSize: '0.82rem' }}>
            ⚠️ {err}
          </div>
        )}
        <div>
          <label style={labelStyle}>اسم المشروع *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: موقع إلكتروني، تطبيق موبايل..." />
        </div>
        <div>
          <label style={labelStyle}>وصف (اختياري)</label>
          <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف مختصر للمشروع" />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>الميزانية *</label>
            <input style={inputStyle} type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>العملة</label>
            <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">$ USD</option>
              <option value="SYP">ل.س SYP</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.4rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleSave}
            disabled={!name.trim() || !budget || saving}
          >
            {saving ? '⏳ جاري الحفظ...' : '✓ حفظ المشروع'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Add Expense Modal ──────────────────────────────── */
function AddExpenseModal({ project, onClose, onSaved }) {
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState(project.currency || 'USD');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(null);

  const handleSave = async () => {
    if (!name.trim() || !amount) return;
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from('creavatex_expenses').insert([{
        project_id: project.id,
        name: name.trim(), amount: parseFloat(amount),
        currency, expense_date: date,
        note: note.trim() || null,
      }]);
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`💸 إضافة مصروف — ${project.name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '0.7rem 1rem', borderRadius: '10px', fontSize: '0.82rem' }}>
            ⚠️ {err}
          </div>
        )}
        <div>
          <label style={labelStyle}>اسم المصروف *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: استضافة، تصميم، برمجة..." />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>المبلغ *</label>
            <input style={inputStyle} type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>العملة</label>
            <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">$ USD</option>
              <option value="SYP">ل.س SYP</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>التاريخ</label>
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ملاحظة (اختياري)</label>
          <input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="أي تفاصيل إضافية..." />
        </div>
        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.4rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleSave}
            disabled={!name.trim() || !amount || saving}
          >
            {saving ? '⏳ جاري الحفظ...' : '✓ حفظ المصروف'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Project Card ───────────────────────────────────── */
function ProjectCard({ project, expenses, color, isAdmin, onAddExpense, onDeleteProject, onDeleteExpense }) {
  const [expanded, setExpanded] = useState(false);

  const projectExpenses = expenses.filter(e => e.project_id === project.id);

  // حساب المصروفات بنفس عملة المشروع
  const totalSpentSameCur = projectExpenses
    .filter(e => e.currency === project.currency)
    .reduce((a, e) => a + Number(e.amount), 0);

  // مصروفات بعملة مختلفة
  const otherCurrExpenses = projectExpenses.filter(e => e.currency !== project.currency);
  const otherCurTotal = otherCurrExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const otherCur = otherCurrExpenses.length > 0 ? otherCurrExpenses[0].currency : null;

  const remaining    = project.budget - totalSpentSameCur;
  const spentPct     = project.budget > 0 ? (totalSpentSameCur / project.budget) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isHealthy    = spentPct < 75;

  return (
    <div
      className="glass-panel"
      style={{
        border: `1px solid ${color}28`,
        borderRadius: '18px',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s',
        marginBottom: '1.2rem',
      }}
    >
      {/* ─── Card Header ─── */}
      <div style={{
        padding: '1.4rem 1.6rem',
        background: `linear-gradient(135deg, ${color}12, rgba(6,8,18,0.7))`,
        borderBottom: expanded ? `1px solid ${color}18` : 'none',
      }}>
        {/* Top row: name + badges + expand */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Color dot */}
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: `linear-gradient(135deg, ${color}, ${color}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', boxShadow: `0 4px 14px ${color}44`, flexShrink: 0,
            }}>
              🗂️
            </div>
            <div>
              <div style={{ fontWeight: '900', color: '#f1f5f9', fontSize: '1rem' }}>{project.name}</div>
              {project.description && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', fontWeight: '600' }}>
                  {project.description}
                </div>
              )}
            </div>
          </div>

          {/* Status badge + delete + expand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '4px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '800',
              background: isOverBudget ? 'rgba(239,68,68,0.12)' : isHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: isOverBudget ? '1px solid rgba(239,68,68,0.3)' : isHealthy ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.25)',
              color: isOverBudget ? '#fca5a5' : isHealthy ? '#6ee7b7' : '#fcd34d',
            }}>
              {isOverBudget ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
              {isOverBudget ? 'تجاوز الميزانية' : isHealthy ? 'ضمن الميزانية' : 'قريب من الحد'}
            </div>
            {isAdmin && (
              <button
                onClick={() => onDeleteProject(project)}
                title="حذف المشروع"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px',
                  padding: '6px',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: `${color}18`, border: `1px solid ${color}33`, borderRadius: '10px', padding: '6px', color, cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* ─── Budget / Spent / Remaining row ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginTop: '1.2rem' }}>
          {[
            { label: 'الميزانية', value: fmt(project.budget, project.currency), subColor: color },
            { label: 'المصروفات', value: fmt(totalSpentSameCur, project.currency), subColor: isOverBudget ? '#ef4444' : '#f59e0b' },
            { label: isOverBudget ? '⚠ العجز' : '✓ المتبقي', value: fmt(Math.abs(remaining), project.currency), subColor: isOverBudget ? '#ef4444' : '#10b981' },
          ].map(({ label, value, subColor }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.7rem 0.9rem', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: subColor, lineHeight: 1.1, wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* مصروفات بعملة مختلفة */}
        {otherCurTotal > 0 && (
          <div style={{ marginTop: '0.8rem', fontSize: '0.73rem', color: 'rgba(255,255,255,0.38)', fontWeight: '600' }}>
            + {fmt(otherCurTotal, otherCur)} بعملة مختلفة
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>نسبة الصرف</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isOverBudget ? '#ef4444' : color }}>
              {spentPct.toFixed(1)}%
            </span>
          </div>
          <ProgressBar pct={spentPct} color={color} danger={isOverBudget} />
        </div>
      </div>

      {/* ─── Expanded: Expenses List ─── */}
      {expanded && (
        <div style={{ padding: '1.2rem 1.4rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              تفاصيل المصروفات ({projectExpenses.length})
            </div>
            {isAdmin && (
              <button
                onClick={() => onAddExpense(project)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '6px 12px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: '700',
                  background: `${color}18`, border: `1px solid ${color}33`,
                  color, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}
              >
                <Plus size={13} /> إضافة مصروف
              </button>
            )}
          </div>

          {projectExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.18)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>📭</div>
              لا توجد مصروفات مسجّلة لهذا المشروع
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: isAdmin ? '1fr 90px 80px 95px 30px' : '1fr 90px 80px 95px',
                gap: '0.5rem', padding: '0 0.8rem',
                fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <span>البيان</span>
                <span style={{ textAlign: 'center' }}>التاريخ</span>
                <span style={{ textAlign: 'center' }}>العملة</span>
                <span style={{ textAlign: 'left' }}>المبلغ</span>
                {isAdmin && <span></span>}
              </div>

              {projectExpenses
                .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
                .map(exp => (
                  <div
                    key={exp.id}
                    style={{
                      display: 'grid', gridTemplateColumns: isAdmin ? '1fr 90px 80px 95px 30px' : '1fr 90px 80px 95px',
                      gap: '0.5rem', padding: '0.65rem 0.8rem',
                      background: 'rgba(255,255,255,0.025)',
                      borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.83rem', fontWeight: '700', color: '#e2e8f0' }}>{exp.name}</div>
                      {exp.note && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{exp.note}</div>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontWeight: '600' }}>
                      {exp.expense_date}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '800',
                        padding: '2px 8px', borderRadius: '6px',
                        background: exp.currency === 'USD' ? 'rgba(16,185,129,0.1)' : `${color}15`,
                        color: exp.currency === 'USD' ? '#6ee7b7' : color,
                        border: exp.currency === 'USD' ? '1px solid rgba(16,185,129,0.2)' : `1px solid ${color}30`,
                      }}>
                        {exp.currency}
                      </span>
                    </div>
                    <div style={{
                      textAlign: 'left', fontWeight: '900', fontSize: '0.92rem',
                      color: exp.currency === 'USD' ? '#10b981' : color,
                    }}>
                      {exp.currency === 'SYP'
                        ? Number(exp.amount).toLocaleString('ar-SY')
                        : Number(exp.amount).toFixed(2)}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteExpense(exp)}
                        title="حذف المصروف"
                        style={{
                          background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '3px', transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.4)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main CreavatexDashboard ────────────────────────── */
export default function CreavatexDashboard({ session }) {
  const [projects, setProjects]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [addExpenseFor, setAddExpenseFor]   = useState(null); // project obj

  const userEmail = (session?.user?.email || '').trim().toLowerCase();
  const userName = (session?.user?.user_metadata?.full_name || '').trim().toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(userEmail) || userEmail.includes('hassandweedary') || userEmail.includes('hilowpr35') || userName.includes('حسان') || userName.includes('hassan') || !session?.user?.email;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: proj }, { data: exp }] = await Promise.all([
        supabase.from('creavatex_projects').select('*').order('created_at', { ascending: true }),
        supabase.from('creavatex_expenses').select('*').order('expense_date', { ascending: false }),
      ]);
      setProjects(proj || []);
      setExpenses(exp || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel('creavatex_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creavatex_projects' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creavatex_expenses' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const handleDeleteProject = async (proj) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشروع "${proj.name}" وكافة مصروفاته؟`)) return;
    try {
      const { error } = await supabase.from('creavatex_projects').delete().eq('id', proj.id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`هل أنت متأكد من حذف المصروف "${exp.name}"؟`)) return;
    try {
      const { error } = await supabase.from('creavatex_expenses').delete().eq('id', exp.id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  /* ── Aggregated Totals ── */
  const totals = projects.reduce((acc, proj) => {
    const projExp = expenses.filter(e => e.project_id === proj.id && e.currency === proj.currency);
    const spent   = projExp.reduce((s, e) => s + Number(e.amount), 0);
    const profit  = proj.budget - spent;
    if (proj.currency === 'USD') {
      acc.budgetUSD  += proj.budget;
      acc.spentUSD   += spent;
      acc.profitUSD  += profit;
    } else {
      acc.budgetSYP  += proj.budget;
      acc.spentSYP   += spent;
      acc.profitSYP  += profit;
    }
    return acc;
  }, { budgetUSD: 0, spentUSD: 0, profitUSD: 0, budgetSYP: 0, spentSYP: 0, profitSYP: 0 });

  /* ── Render ── */
  return (
    <div style={{ direction: 'rtl', paddingBottom: '3rem' }}>

      {/* ══ Section Title ══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', boxShadow: '0 6px 20px rgba(124,58,237,0.4)',
            }}>🏢</div>
            <div>
              <h2 style={{
                fontSize: '1.6rem', fontWeight: '900', margin: 0,
                background: 'linear-gradient(135deg, #fff 15%, #a78bfa 55%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text', color: 'transparent',
                letterSpacing: '-0.03em',
              }}>
                CREAVATEX
              </h2>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700', letterSpacing: '0.08em' }}>
                مصروفات ومرابح المشاريع
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => setShowAddProject(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '10px 18px' }}
          >
            <Plus size={16} /> مشروع جديد
          </button>
        )}
      </div>

      {/* ══ Summary Stat Cards ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.3rem', marginBottom: '2rem' }}>
        <StatCard
          color="#7c3aed"
          icon={DollarSign}
          label="إجمالي الميزانيات"
          valueUSD={`$${totals.budgetUSD.toFixed(2)}`}
          valueSYP={totals.budgetSYP.toLocaleString('ar-SY') + ' ل.س'}
          sub={`${projects.length} مشروع`}
        />
        <StatCard
          color="#f59e0b"
          icon={TrendingUp}
          label="إجمالي المصروفات"
          valueUSD={`$${totals.spentUSD.toFixed(2)}`}
          valueSYP={totals.spentSYP.toLocaleString('ar-SY') + ' ل.س'}
          sub={`${expenses.length} بند مصروف`}
        />
        <StatCard
          color={totals.profitUSD >= 0 ? '#10b981' : '#ef4444'}
          icon={CheckCircle}
          label={totals.profitUSD >= 0 ? 'الربح المتبقي' : '⚠ العجز الكلي'}
          valueUSD={`${totals.profitUSD < 0 ? '-' : ''}$${Math.abs(totals.profitUSD).toFixed(2)}`}
          valueSYP={(totals.profitSYP < 0 ? '-' : '') + Math.abs(totals.profitSYP).toLocaleString('ar-SY') + ' ل.س'}
        />
      </div>

      {/* ══ Projects ══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.4rem' }}>
        <FolderOpen size={18} color="#7c3aed" />
        <span className="section-title">المشاريع</span>
        <span style={{
          background: 'rgba(124,58,237,0.12)', color: 'var(--primary-light)',
          fontSize: '0.7rem', fontWeight: '800', padding: '3px 10px',
          borderRadius: '20px', border: '1px solid rgba(124,58,237,0.22)',
        }}>
          {projects.length} مشروع
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,255,255,0.25)' }}>
          <div className="loader" style={{ margin: '0 auto 1rem' }} />
          جاري تحميل المشاريع...
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', border: '1px dashed rgba(124,58,237,0.2)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>🗂️</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', fontWeight: '700' }}>
            لا توجد مشاريع مسجّلة حتى الآن
          </div>
          {isAdmin && (
            <button
              className="btn-primary"
              onClick={() => setShowAddProject(true)}
              style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '11px 22px' }}
            >
              <Plus size={15} /> أضف أول مشروع
            </button>
          )}
        </div>
      ) : (
        <div>
          {projects.map((proj, idx) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              expenses={expenses}
              color={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
              isAdmin={isAdmin}
              onAddExpense={p => setAddExpenseFor(p)}
              onDeleteProject={handleDeleteProject}
              onDeleteExpense={handleDeleteExpense}
            />
          ))}
        </div>
      )}

      {/* ══ Modals ══ */}
      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onSaved={() => { setShowAddProject(false); fetchData(); }}
        />
      )}
      {addExpenseFor && (
        <AddExpenseModal
          project={addExpenseFor}
          onClose={() => setAddExpenseFor(null)}
          onSaved={() => { setAddExpenseFor(null); fetchData(); }}
        />
      )}
    </div>
  );
}
