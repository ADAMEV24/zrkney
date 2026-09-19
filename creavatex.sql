-- ═══════════════════════════════════════════════════
--  CREAVATEX — جداول المشاريع والمصروفات وسياسات الأمان
-- ═══════════════════════════════════════════════════

-- 1. جدول المشاريع
CREATE TABLE IF NOT EXISTS public.creavatex_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  budget      DECIMAL(14, 2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. جدول المصروفات
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

-- 3. تفعيل Row Level Security
ALTER TABLE public.creavatex_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creavatex_expenses ENABLE ROW LEVEL SECURITY;

-- 4. دالة التحقق من صلاحيات المدير (SECURITY DEFINER لتجاوز قيود جدول users)
CREATE OR REPLACE FUNCTION public.is_creavatex_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', (SELECT email FROM auth.users WHERE id = auth.uid()), '')) 
         IN ('hassandweedary@gmail.com', 'hilowpr35@gmail.com');
$$;

-- 5. حذف السياسات القديمة إن وجدت لمنع أي خطأ تكرار (policy already exists)
DROP POLICY IF EXISTS "قراءة مشاريع CREAVATEX" ON public.creavatex_projects;
DROP POLICY IF EXISTS "إضافة مشروع — المدير فقط" ON public.creavatex_projects;
DROP POLICY IF EXISTS "تعديل مشروع — المدير فقط" ON public.creavatex_projects;
DROP POLICY IF EXISTS "حذف مشروع — المدير فقط" ON public.creavatex_projects;

DROP POLICY IF EXISTS "قراءة مصروفات CREAVATEX" ON public.creavatex_expenses;
DROP POLICY IF EXISTS "إضافة مصروف — المدير فقط" ON public.creavatex_expenses;
DROP POLICY IF EXISTS "تعديل مصروف — المدير فقط" ON public.creavatex_expenses;
DROP POLICY IF EXISTS "حذف مصروف — المدير فقط" ON public.creavatex_expenses;

-- 6. سياسات جدول المشاريع (creavatex_projects)
CREATE POLICY "قراءة مشاريع CREAVATEX"
  ON public.creavatex_projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "إضافة مشروع — المدير فقط"
  ON public.creavatex_projects FOR INSERT TO authenticated
  WITH CHECK (public.is_creavatex_admin());

CREATE POLICY "تعديل مشروع — المدير فقط"
  ON public.creavatex_projects FOR UPDATE TO authenticated
  USING (public.is_creavatex_admin());

CREATE POLICY "حذف مشروع — المدير فقط"
  ON public.creavatex_projects FOR DELETE TO authenticated
  USING (public.is_creavatex_admin());

-- 7. سياسات جدول المصروفات (creavatex_expenses)
CREATE POLICY "قراءة مصروفات CREAVATEX"
  ON public.creavatex_expenses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "إضافة مصروف — المدير فقط"
  ON public.creavatex_expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_creavatex_admin());

CREATE POLICY "تعديل مصروف — المدير فقط"
  ON public.creavatex_expenses FOR UPDATE TO authenticated
  USING (public.is_creavatex_admin());

CREATE POLICY "حذف مصروف — المدير فقط"
  ON public.creavatex_expenses FOR DELETE TO authenticated
  USING (public.is_creavatex_admin());
