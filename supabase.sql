-- إنشاء جدول الحسابات
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إنشاء جدول المعاملات
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- سياسات جدول Profiles
CREATE POLICY "يمكن لأي شخص مسجل رؤية الحسابات" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "يمكن للمستخدم تحديث ملفه" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- سياسات جدول Transactions (الشفافية التامة ومنع التعديل/الحذف)
CREATE POLICY "يمكن لأي شخص مسجل رؤية كل المعاملات" 
ON public.transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "يمكن للمستخدم إضافة معاملة خاصة به" 
ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = payer_id);

-- لا توجد سياسات للـ UPDATE أو DELETE لضمان بقاء البيانات إلى الأبد

-- دالة (Trigger) لإنشاء ملف شخصي تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
