export const metadata = {
  title: 'StudentPay Provider Portal',
  description: 'Provider dashboard for StudentPay payment plans'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
