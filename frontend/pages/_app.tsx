import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import ToastProvider from '../components/shared/ToastProvider'
import Layout from '../components/shared/Layout'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
        try {
          t.select()
        } catch (_) {
          // ignore
        }
      }
    }

    window.addEventListener('focusin', onFocusIn)
    return () => window.removeEventListener('focusin', onFocusIn)
  }, [])

  return (
    <ToastProvider>
      <Head>
        <title>Omnigem NETSide</title>
        <link rel="icon" href="/NETSide_Sistemas_LOGO.png" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ToastProvider>
  )
}
