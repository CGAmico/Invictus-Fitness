// app/login/confirm/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ConfirmClient from './ConfirmClient';

export default function Page() {
  return <ConfirmClient />;
}
