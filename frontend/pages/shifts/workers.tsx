import type { GetServerSideProps } from 'next'

export default function WorkersPage() { return null }

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/shifts', permanent: false },
})
