import React from 'react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { PALETTE } from '../../styles/theme';

/**
 * Página legada — redireciona para o calendário que agora gerencia os rodízios.
 */
export default function RecurringPatternsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/plantoes'); }, [router]);
  return <div style={{ padding: 24, color: PALETTE.textSecondary, backgroundColor: PALETTE.background, minHeight: '100vh' }}>Redirecionando para o calendário…</div>;
}
