import './globals.css';

export const metadata = {
  title: 'زركني — المنصة المالية الشفافة',
  description: 'تتبع مدفوعاتك المشتركة بشفافية ومصداقية. ما يُكتب لا يُعدَّل ولا يُحذف.',
  keywords: 'مالية, مدفوعات, شفافية, حسابات مشتركة',
};

export const viewport = {
  themeColor: '#7c3aed',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
