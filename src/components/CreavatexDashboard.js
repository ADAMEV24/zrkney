'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, TrendingUp, FolderOpen, DollarSign, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, X, Trash2, Users, Layers, PieChart, Filter,
  Search, Calendar, Edit3, Briefcase, ArrowUpDown, FileText, Sparkles, UserCheck
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────── */
const ADMIN_EMAILS = [
  'adamevev101@gmail.com',
  'hassandweedary@gmail.com',
  'hilowpr35@gmail.com'
];

const PROJECT_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981',
  '#a78bfa', '#fb923c', '#ec4899', '#14b8a6',
];

export const EXPENSE_CATEGORIES = [
  { id: 'أجور ورواتب', label: 'أجور ورواتب', icon: '👷‍♂️', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.28)' },
  { id: 'استضافة وسيرفرات', label: 'استضافة وسيرفرات', icon: '🖥️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.28)' },
  { id: 'تصميم وهوية', label: 'تصميم وهوية', icon: '🎨', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.28)' },
  { id: 'تسويق وترويج', label: 'تسويق وترويج', icon: '📢', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' },
  { id: 'تطوير وبرمجة', label: 'تطوير وبرمجة', icon: '⚡', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' },
  { id: 'أدوات ورخص', label: 'أدوات ورخص', icon: '🛠️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)' },
  { id: 'عام', label: 'مصاريف عامة', icon: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.28)' },
];

/* ── Smart Helpers & Extractors ─────────────────────── */
export const fmt = (n, cur) =>
  cur === 'SYP'
    ? Number(n || 0).toLocaleString('ar-SY') + ' ل.س'
    : '$' + Number(n || 0).toFixed(2);

export function normalizeEmployeeName(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^(?:أجور|أجر|راتب|دفعة|مستحقات|حساب)\s*(?:لـ|للأستاذ|لأستاذ|لـأستاذ|لـأ\.|لأ\.|لـ|ل)?\s*/i, '');
  s = s.replace(/^(?:أستاذ|الأستاذ)\s+/i, 'أ. ');
  return s.trim();
}

export function getExpenseEmployee(exp) {
  if (exp.employee_name && exp.employee_name.trim()) {
    return normalizeEmployeeName(exp.employee_name);
  }
  const name = exp.name || '';
  if (/(?:أجور|أجر|راتب|دفعة|مستحقات|حساب)/i.test(name)) {
    const detected = normalizeEmployeeName(name);
    if (detected) return detected;
  }
  return null;
}

export function getExpenseCategory(exp) {
  if (exp.category && exp.category.trim()) return exp.category;
  const name = (exp.name || '').toLowerCase();
  if (/أجور|راتب|أجر|دفعة|مستحقات|سليم|منير|محمود|أحمد|مصطفى/.test(name)) return 'أجور ورواتب';
  if (/سيرفر|استضافة|دومين|domain|server|hosting|vps|cloud|aws/.test(name)) return 'استضافة وسيرفرات';
  if (/تصميم|هوية|شعار|لوجو|ui|ux|figma|ديزاين/.test(name)) return 'تصميم وهوية';
  if (/تسويق|إعلان|ترويج|فيسبوك|facebook|ads|marketing|حملة/.test(name)) return 'تسويق وترويج';
  if (/تطوير|برمجة|api|كود|code|backend|frontend/.test(name)) return 'تطوير وبرمجة';
  if (/رخصة|ترخيص|أداة|tool|license|plugin|اشتراك/.test(name)) return 'أدوات ورخص';
  return 'عام';
}

const getCategoryMeta = (catId) =>
  EXPENSE_CATEGORIES.find(c => c.id === catId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

/* ── UI Styles ──────────────────────────────────────── */
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: 'white',
  fontFamily: 'Cairo, sans-serif',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block', marginBottom: '0.45rem',
  fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
  fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase',
};

/* ── Modal Overlay ──────────────────────────────────── */
function Modal({ title, onClose, maxWidth = '500px', children }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="glass-panel animate-scale-in"
        style={{
          padding: '2.2rem', width: '100%', maxWidth,
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 60px rgba(124,58,237,0.08)',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, transparent, #7c3aed, #06b6d4, transparent)',
          borderRadius: '24px 24px 0 0',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.6rem' }}>
          <h3 style={{ fontWeight: '900', fontSize: '1.15rem', color: 'white', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '6px', display: 'flex', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Project Add / Edit Modal ───────────────────────── */
function ProjectModal({ project = null, onClose, onSaved }) {
  const isEdit = !!project;
  const [name, setName]         = useState(project?.name || '');
  const [desc, setDesc]         = useState(project?.description || '');
  const [budget, setBudget]     = useState(project?.budget !== undefined ? String(project.budget) : '');
  const [currency, setCurrency] = useState(project?.currency || 'USD');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(null);

  const handleSave = async () => {
    if (!name.trim() || !budget) return;
    setSaving(true); setErr(null);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('creavatex_projects')
          .update({
            name: name.trim(),
            description: desc.trim() || null,
            budget: parseFloat(budget),
            currency,
          })
          .eq('id', project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('creavatex_projects').insert([{
          name: name.trim(),
          description: desc.trim() || null,
          budget: parseFloat(budget),
          currency,
        }]);
        if (error) throw error;
      }
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? `✏️ تعديل المشروع — ${project.name}` : '➕ مشروع جديد'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '0.8rem 1rem', borderRadius: '12px', fontSize: '0.84rem' }}>
            ⚠️ {err}
          </div>
        )}
        <div>
          <label style={labelStyle}>اسم المشروع *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: نظام الأكاديمية LMS، منصة دورات..." />
        </div>
        <div>
          <label style={labelStyle}>وصف المشروع (اختياري)</label>
          <textarea
            style={{ ...inputStyle, minHeight: '75px', resize: 'vertical' }}
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="تفاصيل العقد أو المميزات والمخرجات المطلوبة..."
          />
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>الميزانية المتفق عليها *</label>
            <input style={inputStyle} type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>العملة</label>
            <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">$ دولار أمريكي (USD)</option>
              <option value="SYP">ل.س ليرة سورية (SYP)</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 2, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleSave}
            disabled={!name.trim() || !budget || saving}
          >
            {saving ? '⏳ جاري الحفظ...' : isEdit ? '✓ تحديث المشروع' : '✓ حفظ المشروع الجديد'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Add Expense Modal (With Category & Employee selection) ── */
function AddExpenseModal({ projects = [], defaultProject = null, knownEmployees = [], onClose, onSaved }) {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProject?.id || projects[0]?.id || '');
  const activeProj = projects.find(p => p.id === selectedProjectId) || defaultProject || {};

  const [name, setName]                 = useState('');
  const [category, setCategory]         = useState('أجور ورواتب');
  const [employeeName, setEmployeeName] = useState('');
  const [amount, setAmount]             = useState('');
  const [currency, setCurrency]         = useState(activeProj?.currency || 'USD');
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote]                 = useState('');
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState(null);

  // تحديث العملة عند تغيير المشروع المختار
  const handleProjectChange = (pid) => {
    setSelectedProjectId(pid);
    const p = projects.find(x => x.id === pid);
    if (p) setCurrency(p.currency || 'USD');
  };

  const handleSave = async () => {
    if (!selectedProjectId || !name.trim() || !amount) return;
    setSaving(true); setErr(null);

    const payload = {
      project_id: selectedProjectId,
      name: name.trim(),
      amount: parseFloat(amount),
      currency,
      expense_date: date,
      note: note.trim() || null,
      category: category || 'أجور ورواتب',
      employee_name: employeeName.trim() || null,
    };

    try {
      let { error } = await supabase.from('creavatex_expenses').insert([payload]);
      // Fallback في حال كانت أعمدة category أو employee_name غير مضافة بعد في SQL
      if (error && error.message?.includes('column') && (error.message?.includes('category') || error.message?.includes('employee_name'))) {
        const cleanPayload = {
          project_id: selectedProjectId,
          name: name.trim(),
          amount: parseFloat(amount),
          currency,
          expense_date: date,
          note: note.trim() || null,
        };
        const res = await supabase.from('creavatex_expenses').insert([cleanPayload]);
        error = res.error;
      }
      if (error) throw error;
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`💸 إضافة مصروف جديد ${activeProj?.name ? `— ${activeProj.name}` : ''}`} onClose={onClose} maxWidth="540px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {err && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '0.8rem 1rem', borderRadius: '12px', fontSize: '0.82rem' }}>
            ⚠️ {err}
          </div>
        )}

        {/* اختيار المشروع إن لم يكن محدد سلفاً */}
        {!defaultProject && projects.length > 0 && (
          <div>
            <label style={labelStyle}>اختر المشروع المنسوب إليه *</label>
            <select
              style={inputStyle}
              value={selectedProjectId}
              onChange={e => handleProjectChange(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currency})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* اختيار التصنيف بالأزرار */}
        <div>
          <label style={labelStyle}>تصنيف المصروف *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {EXPENSE_CATEGORIES.map(cat => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    if (cat.id === 'أجور ورواتب' && !name) {
                      setName('أجور');
                    }
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '9px',
                    border: isSelected ? `1.5px solid ${cat.color}` : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? cat.bg : 'rgba(255,255,255,0.03)',
                    color: isSelected ? 'white' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.78rem', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* اسم المصروف */}
        <div>
          <label style={labelStyle}>بيان / اسم المصروف *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={e => {
              setName(e.target.value);
              // استخراج الموظف تلقائياً إذا كتب "أجور لسليم"
              if (!employeeName) {
                const detected = normalizeEmployeeName(e.target.value);
                if (detected && detected !== e.target.value) setEmployeeName(detected);
              }
            }}
            placeholder="مثال: أجور لمنير، استضافة سيرفر، تصميم لوجو..."
          />
        </div>

        {/* اسم الموظف مع مقترحات سريعة */}
        <div style={{
          background: category === 'أجور ورواتب' ? 'rgba(6,182,212,0.05)' : 'transparent',
          border: category === 'أجور ورواتب' ? '1px dashed rgba(6,182,212,0.25)' : 'none',
          padding: category === 'أجور ورواتب' ? '0.85rem' : '0',
          borderRadius: '12px',
        }}>
          <label style={{ ...labelStyle, color: category === 'أجور ورواتب' ? '#06b6d4' : labelStyle.color }}>
            👤 اسم الموظف / المستقل (اختياري / للأجور)
          </label>
          <input
            style={inputStyle}
            value={employeeName}
            onChange={e => setEmployeeName(e.target.value)}
            placeholder="مثال: منير، سليم، أ. محمود، أحمد المصطفى..."
          />
          {knownEmployees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>اختيار سريع:</span>
              {knownEmployees.slice(0, 7).map(emp => (
                <button
                  key={emp}
                  type="button"
                  onClick={() => {
                    setEmployeeName(emp);
                    if (!name || name === 'أجور') setName(`أجور لـ ${emp}`);
                  }}
                  style={{
                    padding: '3px 9px', borderRadius: '7px', fontSize: '0.72rem',
                    background: employeeName === emp ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.04)',
                    border: employeeName === emp ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.07)',
                    color: employeeName === emp ? '#67e8f9' : 'rgba(255,255,255,0.65)',
                    cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700',
                  }}
                >
                  + {emp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* المبلغ والعملة */}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>المبلغ *</label>
            <input style={inputStyle} type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>العملة</label>
            <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">$ دولار (USD)</option>
              <option value="SYP">ل.س (SYP)</option>
            </select>
          </div>
        </div>

        {/* التاريخ */}
        <div>
          <label style={labelStyle}>تاريخ الصرف</label>
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* الملاحظات */}
        <div>
          <label style={labelStyle}>ملاحظة أو تفاصيل الدفعة (اختياري)</label>
          <input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="مثال: دفعة أولى، تسليم المرحلة الثانية..." />
        </div>

        {/* أزرار الحفظ */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 2, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleSave}
            disabled={!name.trim() || !amount || saving}
          >
            {saving ? '⏳ جاري الحفظ...' : '✓ حفظ وتوثيق المصروف'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Individual Project Card ────────────────────────── */
function ProjectCard({ project, expenses, color, isAdmin, onAddExpense, onEditProject, onDeleteProject, onDeleteExpense }) {
  const [expanded, setExpanded] = useState(false);

  const projectExpenses = expenses.filter(e => e.project_id === project.id);

  // حساب المصروفات بنفس عملة المشروع
  const sameCurExp = projectExpenses.filter(e => e.currency === project.currency);
  const totalSpent = sameCurExp.reduce((a, e) => a + Number(e.amount), 0);

  // حساب أجور الموظفين تحديداً
  const wagesSpent = sameCurExp
    .filter(e => getExpenseCategory(e) === 'أجور ورواتب')
    .reduce((a, e) => a + Number(e.amount), 0);

  const remaining    = project.budget - totalSpent;
  const spentPct     = project.budget > 0 ? (totalSpent / project.budget) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isHealthy    = spentPct < 75;

  // نسبة الأجور من المصروفات
  const wagesSharePct = totalSpent > 0 ? ((wagesSpent / totalSpent) * 100).toFixed(0) : 0;

  return (
    <div
      className="glass-panel"
      style={{
        border: `1px solid ${color}30`,
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '1.4rem',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ─── Card Header ─── */}
      <div style={{
        padding: '1.5rem 1.8rem',
        background: `linear-gradient(135deg, ${color}14, rgba(10,14,28,0.75))`,
        borderBottom: expanded ? `1px solid ${color}20` : 'none',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${color}, ${color}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', boxShadow: `0 6px 18px ${color}44`, flexShrink: 0,
            }}>
              🗂️
            </div>
            <div>
              <div style={{ fontWeight: '900', color: '#f8fafc', fontSize: '1.12rem', letterSpacing: '-0.02em' }}>
                {project.name}
              </div>
              {project.description && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '3px', fontWeight: '600' }}>
                  {project.description}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '5px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800',
              background: isOverBudget ? 'rgba(239,68,68,0.15)' : isHealthy ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              border: isOverBudget ? '1px solid rgba(239,68,68,0.35)' : isHealthy ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
              color: isOverBudget ? '#fca5a5' : isHealthy ? '#6ee7b7' : '#fcd34d',
            }}>
              {isOverBudget ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
              {isOverBudget ? 'تجاوز الميزانية' : isHealthy ? 'ضمن الميزانية' : 'قريب من الحد'}
            </div>

            {isAdmin && (
              <>
                <button
                  onClick={() => onEditProject(project)}
                  title="تعديل المشروع"
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '7px 9px', color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                    fontSize: '0.74rem', fontFamily: 'Cairo, sans-serif', fontWeight: '700',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                >
                  <Edit3 size={13} /> تعديل
                </button>
                <button
                  onClick={() => onDeleteProject(project)}
                  title="حذف المشروع بالكامل"
                  style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                    borderRadius: '10px', padding: '7px', color: 'var(--danger)',
                    cursor: 'pointer', display: 'flex', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}

            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                background: `${color}18`, border: `1px solid ${color}35`, borderRadius: '10px',
                padding: '7px 11px', color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.74rem', fontFamily: 'Cairo, sans-serif', fontWeight: '700', transition: 'all 0.2s',
              }}
            >
              <span>{expanded ? 'إخفاء التفاصيل' : `المصروفات (${projectExpenses.length})`}</span>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* ─── Metric Cards (Budget, Spent, Remaining) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginTop: '1.4rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem' }}>الميزانية الكلية</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color, lineHeight: 1.1 }}>{fmt(project.budget, project.currency)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem' }}>المصروفات المصروفة</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: isOverBudget ? '#ef4444' : '#f59e0b', lineHeight: 1.1 }}>{fmt(totalSpent, project.currency)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{isOverBudget ? '⚠️ العجز الحاصل' : '✓ الربح المتبقي'}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: isOverBudget ? '#ef4444' : '#10b981', lineHeight: 1.1 }}>{fmt(Math.abs(remaining), project.currency)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.35rem' }}>أجور فريق العمل</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#06b6d4', lineHeight: 1.1 }}>
              {fmt(wagesSpent, project.currency)}
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginRight: '5px' }}>({wagesSharePct}%)</span>
            </div>
          </div>
        </div>

        {/* ─── Progress bar ─── */}
        <div style={{ marginTop: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '0.45rem' }}>
            <span>نسبة استهلاك الميزانية</span>
            <span style={{ color: isOverBudget ? '#ef4444' : isHealthy ? '#10b981' : '#f59e0b', fontWeight: '900' }}>
              {spentPct.toFixed(1)}%
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(spentPct, 100)}%`,
              background: isOverBudget
                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                : isHealthy
                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              borderRadius: '6px',
              boxShadow: isOverBudget ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(6,182,212,0.4)',
              transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
            }} />
          </div>
        </div>
      </div>

      {/* ─── Card Body (Expanded Expenses List) ─── */}
      {expanded && (
        <div style={{ padding: '1.4rem 1.8rem', background: 'rgba(5,7,16,0.65)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span> قائمة مصروفات المشروع ({projectExpenses.length})
            </div>
            {isAdmin && (
              <button
                onClick={() => onAddExpense(project)}
                style={{
                  background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)',
                  borderRadius: '10px', padding: '6px 14px', color: '#06b6d4',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.78rem', fontFamily: 'Cairo, sans-serif', fontWeight: '800',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.15)'}
              >
                <Plus size={14} /> إضافة مصروف لهذا المشروع
              </button>
            )}
          </div>

          {projectExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
              لم يتم تسجيل أي مصروفات لهذا المشروع بعد.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: isAdmin ? '1.5fr 1fr 1fr 90px 100px 35px' : '1.5fr 1fr 1fr 90px 100px',
                gap: '0.6rem', padding: '0 0.8rem',
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                <span>البيان والملاحظة</span>
                <span>التصنيف</span>
                <span>الموظف / المستفيد</span>
                <span style={{ textAlign: 'center' }}>التاريخ</span>
                <span style={{ textAlign: 'left' }}>المبلغ</span>
                {isAdmin && <span></span>}
              </div>

              {projectExpenses
                .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
                .map(exp => {
                  const catId = getExpenseCategory(exp);
                  const catMeta = getCategoryMeta(catId);
                  const emp = getExpenseEmployee(exp);

                  return (
                    <div
                      key={exp.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isAdmin ? '1.5fr 1fr 1fr 90px 100px 35px' : '1.5fr 1fr 1fr 90px 100px',
                        gap: '0.6rem', padding: '0.75rem 0.9rem',
                        background: 'rgba(255,255,255,0.025)',
                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#f1f5f9' }}>{exp.name}</div>
                        {exp.note && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{exp.note}</div>}
                      </div>

                      {/* التصنيف */}
                      <div>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: '800',
                          padding: '3px 8px', borderRadius: '7px',
                          background: catMeta.bg, color: catMeta.color,
                          border: `1px solid ${catMeta.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        }}>
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>
                      </div>

                      {/* الموظف */}
                      <div>
                        {emp ? (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: '800', color: '#38bdf8',
                            background: 'rgba(56,189,248,0.1)', padding: '2px 8px',
                            borderRadius: '6px', border: '1px solid rgba(56,189,248,0.25)',
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          }}>
                            <span>👤</span> {emp}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>—</span>
                        )}
                      </div>

                      {/* التاريخ */}
                      <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: '600' }}>
                        {exp.expense_date}
                      </div>

                      {/* المبلغ */}
                      <div style={{
                        textAlign: 'left', fontWeight: '900', fontSize: '0.98rem',
                        color: exp.currency === 'USD' ? '#10b981' : color,
                      }}>
                        {exp.currency === 'SYP'
                          ? Number(exp.amount).toLocaleString('ar-SY') + ' ل.س'
                          : '$' + Number(exp.amount).toFixed(2)}
                      </div>

                      {/* حذف */}
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteExpense(exp)}
                          title="حذف المصروف"
                          style={{
                            background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px', transition: 'color 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.4)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main CreavatexDashboard Component ──────────────── */
export default function CreavatexDashboard({ session }) {
  const [projects, setProjects]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Sub-tabs navigation: 'projects' | 'team' | 'categories' | 'ledger'
  const [activeSubTab, setActiveSubTab] = useState('projects');

  // Modals state
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [addExpenseProject, setAddExpenseProject] = useState(null); // specific proj or true for general modal
  const [showGlobalExpenseModal, setShowGlobalExpenseModal] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery]           = useState('');
  const [projectStatusFilter, setProjectStatus] = useState('all'); // 'all' | 'healthy' | 'over'
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);

  // Ledger filters state
  const [ledgerProjectFilter, setLedgerProjectFilter]   = useState('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');
  const [ledgerEmployeeFilter, setLedgerEmployeeFilter] = useState('all');
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState('all');

  const userEmail = (session?.user?.email || '').trim().toLowerCase();
  const userName = (session?.user?.user_metadata?.full_name || '').trim().toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(userEmail) || userEmail.includes('adamevev') || userEmail.includes('hassandweedary') || userEmail.includes('hilowpr35') || userName.includes('حسان') || userName.includes('hassan') || !session?.user?.email;

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
      .channel('creavatex_realtime_v2')
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
    } catch (err) { alert('خطأ أثناء الحذف: ' + err.message); }
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`هل أنت متأكد من حذف المصروف "${exp.name}"؟`)) return;
    try {
      const { error } = await supabase.from('creavatex_expenses').delete().eq('id', exp.id);
      if (error) throw error;
      fetchData();
    } catch (err) { alert('خطأ أثناء الحذف: ' + err.message); }
  };

  /* ── 1. Aggregated Totals ── */
  const totals = useMemo(() => {
    return projects.reduce((acc, proj) => {
      const projExp = expenses.filter(e => e.project_id === proj.id && e.currency === proj.currency);
      const spent   = projExp.reduce((s, e) => s + Number(e.amount), 0);
      const profit  = proj.budget - spent;

      // أجور الموظفين فقط
      const wages = projExp
        .filter(e => getExpenseCategory(e) === 'أجور ورواتب')
        .reduce((s, e) => s + Number(e.amount), 0);

      if (proj.currency === 'USD') {
        acc.budgetUSD += proj.budget;
        acc.spentUSD  += spent;
        acc.profitUSD += profit;
        acc.wagesUSD  += wages;
      } else {
        acc.budgetSYP += proj.budget;
        acc.spentSYP  += spent;
        acc.profitSYP += profit;
        acc.wagesSYP  += wages;
      }
      return acc;
    }, { budgetUSD: 0, spentUSD: 0, profitUSD: 0, wagesUSD: 0, budgetSYP: 0, spentSYP: 0, profitSYP: 0, wagesSYP: 0 });
  }, [projects, expenses]);

  /* ── 2. Team & Employees Aggregations ── */
  const teamStats = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const emp = getExpenseEmployee(exp);
      if (!emp) return;

      if (!map[emp]) {
        map[emp] = {
          name: emp,
          totalUSD: 0,
          totalSYP: 0,
          count: 0,
          projectIds: new Set(),
          lastDate: exp.expense_date,
          payments: [],
        };
      }

      if (exp.currency === 'USD') map[emp].totalUSD += Number(exp.amount);
      else map[emp].totalSYP += Number(exp.amount);

      map[emp].count += 1;
      map[emp].projectIds.add(exp.project_id);
      map[emp].payments.push(exp);

      if (new Date(exp.expense_date) > new Date(map[emp].lastDate)) {
        map[emp].lastDate = exp.expense_date;
      }
    });

    const list = Object.values(map).map(e => ({
      ...e,
      projectsCount: e.projectIds.size,
      projectsList: Array.from(e.projectIds).map(pid => projects.find(p => p.id === pid)).filter(Boolean),
    }));

    // ترتيب الموظفين حسب إجمالي ما تقاضوه (USD)
    list.sort((a, b) => b.totalUSD - a.totalUSD);
    return list;
  }, [expenses, projects]);

  const knownEmployeeNames = useMemo(() => teamStats.map(e => e.name), [teamStats]);

  /* ── 3. Category Aggregations ── */
  const categoryStats = useMemo(() => {
    const map = {};
    EXPENSE_CATEGORIES.forEach(c => {
      map[c.id] = { ...c, totalUSD: 0, totalSYP: 0, count: 0, projectIds: new Set() };
    });

    expenses.forEach(exp => {
      const catId = getExpenseCategory(exp);
      if (!map[catId]) {
        map[catId] = { id: catId, label: catId, icon: '📦', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', totalUSD: 0, totalSYP: 0, count: 0, projectIds: new Set() };
      }
      if (exp.currency === 'USD') map[catId].totalUSD += Number(exp.amount);
      else map[catId].totalSYP += Number(exp.amount);
      map[catId].count += 1;
      map[catId].projectIds.add(exp.project_id);
    });

    return Object.values(map).map(c => ({
      ...c,
      pctUSD: totals.spentUSD > 0 ? ((c.totalUSD / totals.spentUSD) * 100).toFixed(1) : 0,
      projectsList: Array.from(c.projectIds).map(pid => projects.find(p => p.id === pid)).filter(Boolean),
    })).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [expenses, projects, totals]);

  /* ── 4. Filtered Projects ── */
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // بحث نصي
      const matchesSearch = !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // فلترة الحالة
      const projExp = expenses.filter(e => e.project_id === p.id && e.currency === p.currency);
      const spent = projExp.reduce((s, e) => s + Number(e.amount), 0);
      const isOver = (p.budget - spent) < 0;

      if (projectStatusFilter === 'healthy' && isOver) return false;
      if (projectStatusFilter === 'over' && !isOver) return false;

      return matchesSearch;
    });
  }, [projects, expenses, searchQuery, projectStatusFilter]);

  /* ── 5. Filtered Ledger Expenses ── */
  const filteredLedgerExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (ledgerProjectFilter !== 'all' && exp.project_id !== ledgerProjectFilter) return false;
      if (ledgerCurrencyFilter !== 'all' && exp.currency !== ledgerCurrencyFilter) return false;

      const cat = getExpenseCategory(exp);
      if (ledgerCategoryFilter !== 'all' && cat !== ledgerCategoryFilter) return false;

      const emp = getExpenseEmployee(exp);
      if (ledgerEmployeeFilter !== 'all' && emp !== ledgerEmployeeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nMatch = (exp.name || '').toLowerCase().includes(q);
        const noteMatch = (exp.note || '').toLowerCase().includes(q);
        const empMatch = emp && emp.toLowerCase().includes(q);
        if (!nMatch && !noteMatch && !empMatch) return false;
      }

      return true;
    });
  }, [expenses, ledgerProjectFilter, ledgerCategoryFilter, ledgerEmployeeFilter, ledgerCurrencyFilter, searchQuery]);

  return (
    <div style={{ direction: 'rtl', paddingBottom: '3.5rem' }}>

      {/* ══ Header Row ══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '2rem', flexWrap: 'wrap', gap: '1.2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(124,58,237,0.45)',
          }}>🏢</div>
          <div>
            <h2 style={{
              fontSize: '1.75rem', fontWeight: '900', margin: 0,
              background: 'linear-gradient(135deg, #fff 15%, #a78bfa 55%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', color: 'transparent',
              letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              CREAVATEX
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: '3px' }}>
              اللوحة الشاملة لإدارة المشاريع ومصروفات الموظفين والمرابح
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowGlobalExpenseModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '10px 18px', borderRadius: '12px',
                background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)',
                color: '#22d3ee', fontFamily: 'Cairo, sans-serif', fontWeight: '800',
                fontSize: '0.86rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.15)'}
            >
              <Plus size={16} /> إضافة مصروف جديد
            </button>
            <button
              className="btn-primary"
              onClick={() => { setEditingProject(null); setShowAddProject(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '10px 20px', fontSize: '0.86rem' }}
            >
              <Plus size={16} /> مشروع جديد
            </button>
          </div>
        )}
      </div>

      {/* ══ Executive Summary Stat Cards ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        {/* الميزانيات */}
        <div className="glass-panel stat-card" style={{ padding: '1.4rem 1.6rem', borderTop: '3px solid #7c3aed', background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, transparent 60%)' }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <DollarSign size={13} color="#7c3aed" /> إجمالي الميزانيات
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '900', color: 'white', lineHeight: 1 }}>
            ${totals.budgetUSD.toFixed(2)}
          </div>
          {totals.budgetSYP > 0 && (
            <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: '0.4rem' }}>
              {totals.budgetSYP.toLocaleString('ar-SY')} ل.س
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginTop: '0.6rem', fontWeight: '700' }}>
            {projects.length} مشاريع مسجلة
          </div>
        </div>

        {/* المصروفات */}
        <div className="glass-panel stat-card" style={{ padding: '1.4rem 1.6rem', borderTop: '3px solid #f59e0b', background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, transparent 60%)' }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingUp size={13} color="#f59e0b" /> إجمالي المصروفات
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#fbbf24', lineHeight: 1 }}>
            ${totals.spentUSD.toFixed(2)}
          </div>
          {totals.spentSYP > 0 && (
            <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: '0.4rem' }}>
              {totals.spentSYP.toLocaleString('ar-SY')} ل.س
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.6rem', fontWeight: '700' }}>
            {expenses.length} عملية صرف موثقة
          </div>
        </div>

        {/* صافي الربح */}
        <div className="glass-panel stat-card" style={{ padding: '1.4rem 1.6rem', borderTop: `3px solid ${totals.profitUSD >= 0 ? '#10b981' : '#ef4444'}`, background: `linear-gradient(135deg, ${totals.profitUSD >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'} 0%, transparent 60%)` }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={13} color={totals.profitUSD >= 0 ? '#10b981' : '#ef4444'} />
            {totals.profitUSD >= 0 ? 'صافي الربح المتبقي' : '⚠️ العجز الكلي'}
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '900', color: totals.profitUSD >= 0 ? '#34d399' : '#f87171', lineHeight: 1 }}>
            {totals.profitUSD < 0 ? '-' : ''}${Math.abs(totals.profitUSD).toFixed(2)}
          </div>
          {totals.profitSYP !== 0 && (
            <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: '0.4rem' }}>
              {(totals.profitSYP < 0 ? '-' : '') + Math.abs(totals.profitSYP).toLocaleString('ar-SY')} ل.س
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: totals.profitUSD >= 0 ? '#6ee7b7' : '#fca5a5', marginTop: '0.6rem', fontWeight: '700' }}>
            {totals.budgetUSD > 0 ? `هامش الربح: ${((totals.profitUSD / totals.budgetUSD) * 100).toFixed(1)}%` : '—'}
          </div>
        </div>

        {/* أجور الموظفين */}
        <div className="glass-panel stat-card" style={{ padding: '1.4rem 1.6rem', borderTop: '3px solid #06b6d4', background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, transparent 60%)' }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={13} color="#06b6d4" /> أجور الموظفين والمستقلين
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: '900', color: '#22d3ee', lineHeight: 1 }}>
            ${totals.wagesUSD.toFixed(2)}
          </div>
          {totals.wagesSYP > 0 && (
            <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: '0.4rem' }}>
              {totals.wagesSYP.toLocaleString('ar-SY')} ل.س
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: '#67e8f9', marginTop: '0.6rem', fontWeight: '700' }}>
            {teamStats.length} موظف ومستقل تقاضوا أجوراً
          </div>
        </div>
      </div>

      {/* ══ Navigation Sub-Tabs ══ */}
      <div style={{
        display: 'flex', gap: '0.6rem', marginBottom: '2rem', flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content',
      }}>
        {[
          { id: 'projects', label: 'المشاريع والمرابح', icon: FolderOpen, count: projects.length },
          { id: 'team', label: 'الموظفون والمستقلون', icon: Users, count: teamStats.length },
          { id: 'categories', label: 'تحليل التصنيفات', icon: PieChart, count: categoryStats.filter(c => c.count > 0).length },
          { id: 'ledger', label: 'سجل المصروفات العام', icon: FileText, count: expenses.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setSelectedEmployeeDetail(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem',
                padding: '10px 20px', borderRadius: '14px',
                border: isActive ? '1px solid rgba(6,182,212,0.45)' : '1px solid transparent',
                background: isActive ? 'linear-gradient(135deg, rgba(6,182,212,0.22), rgba(124,58,237,0.18))' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Cairo, sans-serif', fontWeight: '800', fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.25s',
              }}
            >
              <Icon size={16} color={isActive ? '#22d3ee' : 'currentColor'} />
              <span>{tab.label}</span>
              <span style={{
                fontSize: '0.66rem', padding: '2px 8px', borderRadius: '10px',
                background: isActive ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#67e8f9' : 'rgba(255,255,255,0.4)',
                fontWeight: '900',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 1: PROJECTS VIEW ─────────────────────────── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeSubTab === 'projects' && (
        <div>
          {/* Controls Bar: Search & Status Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="بحث في المشاريع..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, width: '220px', paddingRight: '36px', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', display: 'flex', border: '1px solid rgba(255,255,255,0.07)' }}>
                {[
                  ['all', 'كل المشاريع'],
                  ['healthy', 'ضمن الميزانية'],
                  ['over', 'تجاوزت الميزانية']
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setProjectStatus(val)}
                    style={{
                      background: projectStatusFilter === val ? 'rgba(124,58,237,0.3)' : 'transparent',
                      border: projectStatusFilter === val ? '1px solid rgba(124,58,237,0.4)' : 'none',
                      color: projectStatusFilter === val ? '#fff' : 'rgba(255,255,255,0.5)',
                      padding: '6px 14px', borderRadius: '9px', fontSize: '0.78rem',
                      fontFamily: 'Cairo, sans-serif', fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>
              عرض {filteredProjects.length} من أصل {projects.length} مشروع
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,255,255,0.3)' }}>
              <div className="loader" style={{ margin: '0 auto 1.2rem' }} />
              جاري تحميل بيانات المشاريع والمصروفات...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', border: '1px dashed rgba(124,58,237,0.25)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>🗂️</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', fontWeight: '700' }}>
                {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لا توجد مشاريع مسجّلة حتى الآن'}
              </div>
              {isAdmin && !searchQuery && (
                <button
                  className="btn-primary"
                  onClick={() => setShowAddProject(true)}
                  style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '11px 24px' }}
                >
                  <Plus size={16} /> أضف أول مشروع
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredProjects.map((proj, idx) => (
                <ProjectCard
                  key={proj.id}
                  project={proj}
                  expenses={expenses}
                  color={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                  isAdmin={isAdmin}
                  onAddExpense={p => setAddExpenseProject(p)}
                  onEditProject={p => { setEditingProject(p); setShowAddProject(true); }}
                  onDeleteProject={handleDeleteProject}
                  onDeleteExpense={handleDeleteExpense}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 2: TEAM & EMPLOYEES VIEW ─────────────────── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeSubTab === 'team' && (
        <div>
          {/* Top Info Banner */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', margin: 0 }}>
                👥 الموظفون والمستقلون وأتعاب المشاريع
              </h3>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '3px' }}>
                تتبع مستحقات كل شخص، عدد المشاريع التي ساهم فيها، وسجل دفعاته
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="بحث عن موظف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: '220px', paddingRight: '36px', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {teamStats.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', border: '1px dashed rgba(6,182,212,0.25)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>👷‍♂️</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', fontWeight: '700' }}>
                لم يتم تسجيل أي أجور لموظفين حتى الآن
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                عند إضافة أي مصروف بعنوان "أجور لمنير" أو باختيار اسم الموظف، ستظهر إحصائياته هنا تلقائياً.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.3rem' }}>
              {teamStats
                .filter(emp => !searchQuery.trim() || emp.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((emp, idx) => {
                  const empColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                  const sharePct = totals.wagesUSD > 0 ? ((emp.totalUSD / totals.wagesUSD) * 100).toFixed(1) : 0;
                  const isExpanded = selectedEmployeeDetail === emp.name;

                  return (
                    <div
                      key={emp.name}
                      className="glass-panel"
                      style={{
                        padding: '1.6rem',
                        border: `1px solid ${empColor}30`,
                        borderRadius: '20px',
                        background: `linear-gradient(135deg, ${empColor}0f 0%, rgba(10,14,28,0.7) 60%)`,
                        transition: 'all 0.25s',
                      }}
                    >
                      {/* Top Person Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '14px',
                            background: `linear-gradient(135deg, ${empColor}, ${empColor}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', fontWeight: '900', color: 'white',
                            boxShadow: `0 6px 16px ${empColor}33`,
                          }}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc' }}>
                              {emp.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: '2px' }}>
                              {emp.projectsCount} {emp.projectsCount === 1 ? 'مشروع شارك فيه' : 'مشاريع ساهم فيها'}
                            </div>
                          </div>
                        </div>

                        {/* Total Earned Badge */}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#22d3ee', lineHeight: 1 }}>
                            ${emp.totalUSD.toFixed(2)}
                          </div>
                          {emp.totalSYP > 0 && (
                            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: '2px' }}>
                              {emp.totalSYP.toLocaleString('ar-SY')} ل.س
                            </div>
                          )}
                          <div style={{ fontSize: '0.66rem', color: empColor, fontWeight: '800', marginTop: '3px' }}>
                            {sharePct}% من إجمالي أجور الشركة
                          </div>
                        </div>
                      </div>

                      {/* Projects Badges */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                          المشاريع المرتبطة ({emp.projectsCount})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {emp.projectsList.map(p => (
                            <span
                              key={p.id}
                              style={{
                                fontSize: '0.72rem', fontWeight: '800', padding: '3px 9px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              🗂️ {p.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Meta stats: payments count & last date */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700',
                        padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.025)',
                        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)',
                        marginBottom: '1rem',
                      }}>
                        <span>عدد الدفعات: <strong style={{ color: 'white' }}>{emp.count}</strong></span>
                        <span>آخر دفعة: <strong style={{ color: 'white' }}>{emp.lastDate}</strong></span>
                      </div>

                      {/* Expand / Collapse Details Button */}
                      <button
                        onClick={() => setSelectedEmployeeDetail(isExpanded ? null : emp.name)}
                        style={{
                          width: '100%', padding: '9px', borderRadius: '10px',
                          background: isExpanded ? `${empColor}25` : 'rgba(255,255,255,0.04)',
                          border: isExpanded ? `1px solid ${empColor}45` : '1px solid rgba(255,255,255,0.08)',
                          color: isExpanded ? '#fff' : 'rgba(255,255,255,0.65)',
                          fontSize: '0.78rem', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span>{isExpanded ? 'إغلاق سجل الدفعات' : `عرض سجل كافة دفعات ${emp.name} (${emp.count})`}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {/* Expanded Payments History */}
                      {isExpanded && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                          {emp.payments.map(p => {
                            const parentProj = projects.find(pr => pr.id === p.project_id);
                            return (
                              <div
                                key={p.id}
                                style={{
                                  padding: '0.65rem 0.85rem', borderRadius: '9px',
                                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f1f5f9' }}>{p.name}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                    مشروع: {parentProj?.name || '—'} · {p.expense_date}
                                  </div>
                                </div>
                                <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#10b981' }}>
                                  {p.currency === 'SYP' ? Number(p.amount).toLocaleString('ar-SY') + ' ل.س' : '$' + Number(p.amount).toFixed(2)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 3: CATEGORIES ANALYTICS VIEW ─────────────── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeSubTab === 'categories' && (
        <div>
          <div style={{ marginBottom: '1.8rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', margin: 0 }}>
              📊 تصنيف وتحليل مصاريف الشركة
            </h3>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '3px' }}>
              معرفة إلى أين تذهب أموال الشركة بالتفصيل (أجور، استضافة، تسويق، تصميم...)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.3rem' }}>
            {categoryStats.map(cat => {
              const hasSpent = cat.totalUSD > 0 || cat.totalSYP > 0;
              return (
                <div
                  key={cat.id}
                  className="glass-panel"
                  style={{
                    padding: '1.6rem',
                    borderRadius: '20px',
                    border: `1px solid ${cat.border}`,
                    background: `linear-gradient(135deg, ${cat.bg} 0%, rgba(10,14,28,0.7) 65%)`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '13px',
                        background: cat.bg, border: `1px solid ${cat.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem',
                      }}>
                        {cat.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: '900', color: 'white' }}>{cat.label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: '2px' }}>
                          {cat.count} {cat.count === 1 ? 'بند مصروف' : 'بنود مصروفات'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: '900', color: cat.color, lineHeight: 1 }}>
                        ${cat.totalUSD.toFixed(2)}
                      </div>
                      {cat.totalSYP > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: '3px' }}>
                          {cat.totalSYP.toLocaleString('ar-SY')} ل.س
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar representing share */}
                  <div style={{ marginBottom: '1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '0.4rem' }}>
                      <span>نسبة من إجمالي المصروفات</span>
                      <span style={{ color: cat.color, fontWeight: '900' }}>{cat.pctUSD}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(cat.pctUSD, 100)}%`,
                        background: `linear-gradient(90deg, ${cat.color}aa, ${cat.color})`,
                        borderRadius: '6px',
                        boxShadow: `0 0 8px ${cat.color}66`,
                      }} />
                    </div>
                  </div>

                  {/* Related projects */}
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      المشاريع المرتبطة ({cat.projectsList.length})
                    </div>
                    {cat.projectsList.length === 0 ? (
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>لا توجد مشاريع حتى الآن</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {cat.projectsList.map(p => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '7px',
                              background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)',
                              border: '1px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 4: ALL EXPENSES LEDGER ───────────────────── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeSubTab === 'ledger' && (
        <div>
          {/* Header & Multi-Filter Bar */}
          <div style={{ marginBottom: '1.6rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', margin: '0 0 1rem 0' }}>
              📋 سجل المصروفات العام (All Expenses Ledger)
            </h3>

            {/* Filter controls row */}
            <div style={{
              display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.025)', padding: '1rem', borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="بحث في البيان والملاحظات..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '36px', fontSize: '0.84rem' }}
                />
              </div>

              {/* Project Filter */}
              <div style={{ flex: '1 1 150px' }}>
                <select
                  style={inputStyle}
                  value={ledgerProjectFilter}
                  onChange={e => setLedgerProjectFilter(e.target.value)}
                >
                  <option value="all">كل المشاريع ({projects.length})</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ flex: '1 1 150px' }}>
                <select
                  style={inputStyle}
                  value={ledgerCategoryFilter}
                  onChange={e => setLedgerCategoryFilter(e.target.value)}
                >
                  <option value="all">كل التصنيفات</option>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div style={{ flex: '1 1 150px' }}>
                <select
                  style={inputStyle}
                  value={ledgerEmployeeFilter}
                  onChange={e => setLedgerEmployeeFilter(e.target.value)}
                >
                  <option value="all">كل الموظفين ({knownEmployeeNames.length})</option>
                  {knownEmployeeNames.map(emp => (
                    <option key={emp} value={emp}>👤 {emp}</option>
                  ))}
                </select>
              </div>

              {/* Currency Filter */}
              <div style={{ flex: '0 1 110px' }}>
                <select
                  style={inputStyle}
                  value={ledgerCurrencyFilter}
                  onChange={e => setLedgerCurrencyFilter(e.target.value)}
                >
                  <option value="all">العملات</option>
                  <option value="USD">USD $</option>
                  <option value="SYP">SYP ل.س</option>
                </select>
              </div>

              {/* Reset button */}
              {(ledgerProjectFilter !== 'all' || ledgerCategoryFilter !== 'all' || ledgerEmployeeFilter !== 'all' || ledgerCurrencyFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setLedgerProjectFilter('all');
                    setLedgerCategoryFilter('all');
                    setLedgerEmployeeFilter('all');
                    setLedgerCurrencyFilter('all');
                    setSearchQuery('');
                  }}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171', padding: '10px 14px', borderRadius: '12px',
                    fontFamily: 'Cairo, sans-serif', fontWeight: '800', fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>

          {/* Ledger Table Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>
            <span>عرض {filteredLedgerExpenses.length} من أصل {expenses.length} عملية</span>
            <span>
              إجمالي المعروض: <strong style={{ color: '#22d3ee' }}>
                ${filteredLedgerExpenses.filter(e => e.currency === 'USD').reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
              </strong>
            </span>
          </div>

          {filteredLedgerExpenses.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📋</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: '700' }}>
                لا توجد مصروفات تطابق خيارات الفلترة المحددة
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: isAdmin ? '1.5fr 1.2fr 1fr 1fr 90px 105px 35px' : '1.5fr 1.2fr 1fr 1fr 90px 105px',
                gap: '0.6rem', padding: '1rem 1.2rem',
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span>البيان والملاحظة</span>
                <span>المشروع</span>
                <span>التصنيف</span>
                <span>الموظف / المستفيد</span>
                <span style={{ textAlign: 'center' }}>التاريخ</span>
                <span style={{ textAlign: 'left' }}>المبلغ</span>
                {isAdmin && <span></span>}
              </div>

              {/* Table rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredLedgerExpenses.map((exp, idx) => {
                  const parentProj = projects.find(pr => pr.id === exp.project_id);
                  const catId = getExpenseCategory(exp);
                  const catMeta = getCategoryMeta(catId);
                  const emp = getExpenseEmployee(exp);

                  return (
                    <div
                      key={exp.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isAdmin ? '1.5fr 1.2fr 1fr 1fr 90px 105px 35px' : '1.5fr 1.2fr 1fr 1fr 90px 105px',
                        gap: '0.6rem', padding: '0.85rem 1.2rem',
                        alignItems: 'center',
                        borderBottom: idx < filteredLedgerExpenses.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      {/* Name & Note */}
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>{exp.name}</div>
                        {exp.note && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{exp.note}</div>}
                      </div>

                      {/* Project Name */}
                      <div>
                        <span style={{
                          fontSize: '0.74rem', fontWeight: '800', color: 'rgba(255,255,255,0.85)',
                          background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '7px',
                          border: '1px solid rgba(255,255,255,0.07)', display: 'inline-block',
                        }}>
                          🗂️ {parentProj?.name || 'مشروع غير معرف'}
                        </span>
                      </div>

                      {/* Category */}
                      <div>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: '800',
                          padding: '3px 8px', borderRadius: '7px',
                          background: catMeta.bg, color: catMeta.color,
                          border: `1px solid ${catMeta.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        }}>
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>
                      </div>

                      {/* Employee */}
                      <div>
                        {emp ? (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: '800', color: '#38bdf8',
                            background: 'rgba(56,189,248,0.1)', padding: '2px 8px',
                            borderRadius: '6px', border: '1px solid rgba(56,189,248,0.25)',
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          }}>
                            <span>👤</span> {emp}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: '600' }}>
                        {exp.expense_date}
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: 'left', fontWeight: '900', fontSize: '1rem', color: exp.currency === 'USD' ? '#10b981' : '#f59e0b' }}>
                        {exp.currency === 'SYP' ? Number(exp.amount).toLocaleString('ar-SY') + ' ل.س' : '$' + Number(exp.amount).toFixed(2)}
                      </div>

                      {/* Delete Action */}
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteExpense(exp)}
                          title="حذف هذا البند"
                          style={{
                            background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px', transition: 'color 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.4)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ Modals ══ */}

      {/* 1. Add / Edit Project Modal */}
      {showAddProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => { setShowAddProject(false); setEditingProject(null); }}
          onSaved={() => { setShowAddProject(false); setEditingProject(null); fetchData(); }}
        />
      )}

      {/* 2. Add Expense for Specific Project */}
      {addExpenseProject && (
        <AddExpenseModal
          projects={projects}
          defaultProject={addExpenseProject}
          knownEmployees={knownEmployeeNames}
          onClose={() => setAddExpenseProject(null)}
          onSaved={() => { setAddExpenseProject(null); fetchData(); }}
        />
      )}

      {/* 3. Global Add Expense Modal */}
      {showGlobalExpenseModal && (
        <AddExpenseModal
          projects={projects}
          defaultProject={null}
          knownEmployees={knownEmployeeNames}
          onClose={() => setShowGlobalExpenseModal(false)}
          onSaved={() => { setShowGlobalExpenseModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
