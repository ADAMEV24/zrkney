-- ═══════════════════════════════════════════════════
--  CREAVATEX — جداول المشاريع والمصروفات
-- ═══════════════════════════════════════════════════

-- جدول المشاريع
CREATE TABLE IF NOT EXISTS public.creavatex_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  budget      DECIMAL(14, 2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- جدول المصروفات
CREATE TABLE IF NOT EXISTS public.creavatex_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES public.creavatex_projects(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  amount       DECIMAL(14, 2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL,
  note         TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- تفعيل Row Level Security
ALTER TABLE public.creavatex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creavatex_expenses ENABLE ROW LEVEL SECURITY;

-- ─── سياسات القراءة (لأي مستخدم مسجّل) ───────────
CREATE POLICY "قراءة مشاريع CREAVATEX"
  ON public.creavatex_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "قراءة مصروفات CREAVATEX"
  ON public.creavatex_expenses FOR SELECT TO authenticated USING (true);

-- ─── سياسات الكتابة (المدير فقط) ──────────────────
CREATE POLICY "إضافة مشروع — المدير فقط"
  ON public.creavatex_projects FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

CREATE POLICY "تعديل مشروع — المدير فقط"
  ON public.creavatex_projects FOR UPDATE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

CREATE POLICY "إضافة مصروف — المدير فقط"
  ON public.creavatex_expenses FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

CREATE POLICY "تعديل مصروف — المدير فقط"
  ON public.creavatex_expenses FOR UPDATE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

CREATE POLICY "حذف مصروف — المدير فقط"
  ON public.creavatex_expenses FOR DELETE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

CREATE POLICY "حذف مشروع — المدير فقط"
  ON public.creavatex_projects FOR DELETE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com')
  );

