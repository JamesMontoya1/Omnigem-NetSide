import type { GetServerSideProps } from 'next'

export default function HolidaysRedirect() { return null }

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/shifts', permanent: true },
})
