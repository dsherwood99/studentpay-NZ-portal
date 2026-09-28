'use client';

import PortalShell from '../components/PortalShell';
import '../preview/preview.css';
import { BRAND_PREVIEW_PLANS } from './fixtures';

export default function BrandPreviewClient() {
  return (
    <PortalShell
      firstName="David"
      providerName="Online Learning Institute"
      plans={BRAND_PREVIEW_PLANS}
      loading={false}
      errorMessage=""
      demoBanner
    />
  );
}
