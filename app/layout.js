import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Poppins } from 'next/font/google';
import './styles.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: 'StudentPay NZ Provider Portal',
  description: 'StudentPay NZ Provider Portal',
  icons: {
    icon: '/brand/studentpay-favicon.png',
    apple: '/brand/studentpay-nz-logo.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en-NZ" className={`${inter.variable} ${poppins.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
