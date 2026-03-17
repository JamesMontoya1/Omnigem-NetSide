import type { GetServerSideProps } from 'next'

export default function DashboardRedirect() { return null }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const tab = ctx.query.tab ? `?tab=${ctx.query.tab}` : ''
  return {
    redirect: { destination: `/shifts${tab}`, permanent: true },
  }
}
