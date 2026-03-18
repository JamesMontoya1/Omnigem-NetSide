import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import ToastProvider from '../components/shared/ToastProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Head>
        <title>Omnigem NETSide</title>
        <link rel="icon" href="/Icon_NETSide.png" />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  )
}
