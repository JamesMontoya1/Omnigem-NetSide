import React from 'react'

type Props = {
  overlay: any
  modal: any
  form: any
  setForm: any
  cities: any[]
  setShowCitiesClientsModal: (v: boolean) => void
  setInfoModal: any
  CurrencyInput: any
  inputStyle: any
  selectStyle: any
  labelStyle: any
  btnSmallBlue: any
  btnSmallRed: any
  btnSmall: any
  btnCancel: any
  btnPrimary: any
  PALETTE: any
}

export default function CitiesClientsModal(props: Props) {
  const {
    overlay, modal, form, setForm, cities, setShowCitiesClientsModal, setInfoModal,
    CurrencyInput, inputStyle, selectStyle, labelStyle,
    btnSmallBlue, btnSmallRed, btnSmall, btnCancel, btnPrimary, PALETTE,
  } = props

  return (
    <div style={overlay} onClick={() => setShowCitiesClientsModal(false)}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Cidades & Clientes</h3>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ color: PALETTE.textSecondary, fontSize: 12 }}>Selecione uma cidade e adicione clientes para ela.</div>
            <div>
              <button type="button" onClick={() => setForm((f: any) => {
                const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                citiesArr.push({ cityId: '', clients: [{ name: '', price: '', info: '' }], notes: '' })
                return { ...f, cities: citiesArr }
              })} style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}>+ Adicionar cidade</button>
            </div>
          </div>

          {(form as any).cities?.map((cityBlock: any, ci: number) => (
            <div
              key={ci}
              style={{
                marginTop: 12,
                marginBottom: 8,
                padding: 12,
                borderRadius: 8,
                background: PALETTE.cardBg,
                boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                border: `1px solid ${PALETTE.border}`,
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select required value={cityBlock.cityId} onChange={e => setForm((f: any) => {
                  const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                  citiesArr[ci] = { ...citiesArr[ci], cityId: e.target.value }
                  return { ...f, cities: citiesArr }
                })} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">Selecione cidade...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}{c.state ? ` - ${c.state}` : ''}</option>)}
                </select>
                {((form as any).cities || []).length > 1 ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setForm((f: any) => {
                        const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                        if (ci <= 0) return f
                        const tmp = citiesArr[ci - 1]
                        citiesArr[ci - 1] = citiesArr[ci]
                        citiesArr[ci] = tmp
                        return { ...f, cities: citiesArr }
                      })}
                      style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                      title="Mover para cima"
                    >▲</button>

                    <button
                      type="button"
                      onClick={() => setForm((f: any) => {
                        const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                        if (ci >= citiesArr.length - 1) return f
                        const tmp = citiesArr[ci + 1]
                        citiesArr[ci + 1] = citiesArr[ci]
                        citiesArr[ci] = tmp
                        return { ...f, cities: citiesArr }
                      })}
                      style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                      title="Mover para baixo"
                    >▼</button>

                    <button type="button" onClick={() => setForm((f: any) => {
                      const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                      citiesArr.splice(ci, 1)
                      return { ...f, cities: citiesArr }
                    })} style={{ ...(btnSmallRed as any), padding: '6px 8px' }}>Remover</button>
                  </div>
                ) : <div style={{ width: 120 }} />}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={labelStyle}>Clientes</label>
                  <button type="button" onClick={() => setForm((f: any) => {
                    const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                    const block = citiesArr[ci] || { clients: [] }
                    const clients = Array.isArray(block.clients) ? [...block.clients] : []
                    clients.push({ name: '', price: '', info: '' })
                    citiesArr[ci] = { ...(citiesArr[ci] || {}), clients }
                    return { ...f, cities: citiesArr }
                  })} style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}>+</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Nome</div>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Valor (serviço)</div>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Info</div>
                  <div />
                </div>

                {(cityBlock.clients || []).map((c: any, idx: number) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 8, marginTop: 8 }}>
                    <input type="text" placeholder="Nome do cliente" value={c.name} onChange={e => setForm((f: any) => {
                      const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                      const clients = Array.isArray(citiesArr[ci].clients) ? [...citiesArr[ci].clients] : []
                      clients[idx] = { ...clients[idx], name: e.target.value }
                      citiesArr[ci] = { ...citiesArr[ci], clients }
                      return { ...f, cities: citiesArr }
                    })} style={inputStyle} />
                    <div style={{ position: 'relative' }}>
                      <CurrencyInput
                        value={c.price}
                        onChange={v => setForm((f: any) => {
                          const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                          const clients = Array.isArray(citiesArr[ci].clients) ? [...citiesArr[ci].clients] : []
                          clients[idx] = { ...clients[idx], price: v }
                          citiesArr[ci] = { ...citiesArr[ci], clients }
                          return { ...f, cities: citiesArr }
                        })}
                        inputStyle={inputStyle}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setInfoModal({ open: true, ci, idx, value: c.info || '' })}
                        style={{ ...(c.info ? (btnSmallBlue as any) : (btnSmall as any)), padding: '6px 8px', textAlign: 'left', width: '100%' }}
                      >
                        {c.info ? 'Editar info' : 'Adicionar info'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {idx === 0 ? (
                        <div style={{ width: 32 }} />
                      ) : (
                        <button type="button" onClick={() => setForm((f: any) => {
                          const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                          const clients = Array.isArray(citiesArr[ci].clients) ? [...citiesArr[ci].clients] : []
                          clients.splice(idx, 1)
                          citiesArr[ci] = { ...citiesArr[ci], clients }
                          return { ...f, cities: citiesArr }
                        })} style={{ ...(btnSmallRed as any), padding: '6px 8px' }}>✖</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setShowCitiesClientsModal(false)} style={btnCancel as any}>Fechar</button>
          <button type="button" onClick={() => setShowCitiesClientsModal(false)} style={btnPrimary as any}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
