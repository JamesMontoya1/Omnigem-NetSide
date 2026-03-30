import Head from 'next/head'
import type { NextPage } from 'next'
import { useState } from 'react'
import { PALETTE, btnNav } from '../../styles/theme'

type Tab = 'overview' | 'records'

const SpedControl: NextPage = () => {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif', color: PALETTE.textPrimary }}>
      <Head>
        <title>SPED Control</title>
      </Head>

      <div style={{ padding: '16px 24px', paddingLeft: 80, display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${PALETTE.border}` }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Controle SPED</h1>
        <div style={{ flex: 1 }} />
        {(['overview', 'records'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...btnNav,
            background: tab === t ? PALETTE.primary : PALETTE.hoverBg,
            color: tab === t ? '#fff' : PALETTE.textPrimary,
            border: tab === t ? 'none' : `1px solid ${PALETTE.border}`,
          }}>
            {t === 'overview' ? 'Visão Geral' : 'Registros'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, flex: 1, minHeight: 0 }}>
        {tab === 'overview' && (
          <div>
            <h2 style={{ marginTop: 0 }}>Visão Geral</h2>
            <p>Conteúdo inicial do módulo SPED.</p>
          </div>
        )}
        {tab === 'records' && (
          <div>
            <h2 style={{ marginTop: 0 }}>Registros</h2>
            <p>Aqui estarão os registros do SPED.</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default SpedControl
