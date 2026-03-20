import React from 'react'
import { PALETTE, btnPrimary, btnSmallBlue, btnSmallRed, cardStyle } from '../../styles/theme'

type ServiceType = { id: number; name: string; code?: string }

export default function ServiceTypesTab({
  serviceTypes,
  canEdit,
  openNewServiceType,
  openEditServiceType,
  handleDeleteServiceType,
}: {
  serviceTypes: ServiceType[]
  canEdit: boolean
  openNewServiceType: () => void
  openEditServiceType: (s: ServiceType) => void
  handleDeleteServiceType: (id: number) => void
}) {
  return (
    <>
      <div style={{ display: 'flex', padding: '0 24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Tipos</h3>
        {canEdit && <button onClick={openNewServiceType} style={btnPrimary as any}>+ Novo Tipo</button>}
      </div>
      <div style={{ display: 'grid', padding: '0 24px', gap: 6 }}>
        {serviceTypes.map(s => (
          <div key={s.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              {s.code && <span style={{ color: PALETTE.textSecondary, marginLeft: 6, fontSize: 13 }}>— {s.code}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {canEdit ? (
                <>
                  <button onClick={() => openEditServiceType(s)} style={btnSmallBlue as any}>Editar</button>
                  <button onClick={() => handleDeleteServiceType(s.id)} style={btnSmallRed as any}>Excluir</button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        {serviceTypes.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhum tipo cadastrado.</div>}
      </div>
    </>
  )
}
