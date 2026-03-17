import React from 'react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { PALETTE } from '../../styles/theme';

export default function RecurringPatternsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/shifts'); }, [router]);
  return <div style={{ padding: 24, color: PALETTE.textSecondary, backgroundColor: PALETTE.background, minHeight: '100vh' }}>Redirecionando para o calendário…</div>;
}
