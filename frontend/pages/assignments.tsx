import type { GetServerSideProps } from 'next'

export default function AssignmentsRedirect() { return null }

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/plantoes', permanent: true },
})
