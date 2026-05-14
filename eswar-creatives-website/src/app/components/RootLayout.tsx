import { Outlet } from 'react-router';
import { ScrollToTop } from './ScrollToTop';

export function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}
