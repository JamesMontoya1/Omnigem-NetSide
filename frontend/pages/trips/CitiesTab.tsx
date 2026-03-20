import React from 'react'
import { PALETTE, btnPrimary, btnSmallBlue, btnSmallRed, cardStyle } from '../../styles/theme'

type City = { id: number; name: string; state?: string; country?: string }

export default function CitiesTab({
  cities,
  canEdit,
  openNewCity,
  openEditCity,
  handleDeleteCity,
}: {
  cities: City[]
  canEdit: boolean
  openNewCity: () => void
  openEditCity: (c: City) => void
  handleDeleteCity: (id: number) => void
}) {
  return (
    <>
      <div style={{ display: 'flex', padding: '0 24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Cidades</h3>
        {canEdit && <button onClick={openNewCity} style={btnPrimary as any}>+ Nova Cidade</button>}
      </div>
      <div style={{ display: 'grid', padding: '0 24px', gap: 6 }}>
        {cities.map(c => (
          <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              {c.state && <span style={{ color: PALETTE.textSecondary, marginLeft: 6, fontSize: 13 }}>— {c.state}</span>}
              {c.country && c.country !== 'BR' && <span style={{ color: PALETTE.textSecondary, marginLeft: 4, fontSize: 12 }}>({c.country})</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {canEdit ? (
                <>
                  <button onClick={() => openEditCity(c)} style={btnSmallBlue as any}>Editar</button>
                  <button onClick={() => handleDeleteCity(c.id)} style={btnSmallRed as any}>Excluir</button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        {cities.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma cidade cadastrada.</div>}
      </div>
    </>
  )
}
