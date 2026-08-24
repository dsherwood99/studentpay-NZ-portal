'use client';

import { useEffect, useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import PortalShell from '../components/PortalShell';
import './preview.css';

export default function PreviewPortal() {
  const { user, isLoaded: userIsLoaded } = useUser();

  const firstName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    'there';

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch('/api/plans', {
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Unable to load payment plans.'
          );
        }

        setPlans(data.plans || []);
        setProviderName(data.providerName || '');
      } catch (error) {
        console.error('Unable to load plans:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load payment plans.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  return (
    <PortalShell
      firstName={userIsLoaded ? firstName : ''}
      providerName={providerName}
      plans={plans}
      loading={loading}
      errorMessage={errorMessage}
      accountSlot={<UserButton afterSignOutUrl="/sign-in" />}
    />
  );
}
