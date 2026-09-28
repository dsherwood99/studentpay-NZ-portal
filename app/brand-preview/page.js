import { notFound } from 'next/navigation';
import BrandPreviewClient from './BrandPreviewClient';

export const dynamic = 'force-dynamic';

function isBrandPreviewEnabled() {
  // Vercel Preview builds also set NODE_ENV=production.
  // Block only the Production environment; never enable there.
  if (process.env.VERCEL_ENV === 'production') {
    return false;
  }

  return process.env.ENABLE_BRAND_PREVIEW === 'true';
}

export default function BrandPreviewPage() {
  if (!isBrandPreviewEnabled()) {
    notFound();
  }

  return <BrandPreviewClient />;
}
