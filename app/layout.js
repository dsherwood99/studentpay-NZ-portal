import { ClerkProvider } from '@clerk/nextjs';
import './styles.css';

export const metadata = {
  title: 'StudentPay NZ Provider Portal',
  description: 'StudentPay NZ Provider Portal',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}