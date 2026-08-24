import { notFound } from 'next/navigation';
import BrandPreviewClient from './BrandPreviewClient';

export const dynamic = 'force-dynamic';

function isBrandPreviewEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_BRAND_PREVIEW === 'true'
  );
}

export default function BrandPreviewPage() {
  if (!isBrandPreviewEnabled()) {
    notFound();
  }

  return <BrandPreviewClient />;
}
