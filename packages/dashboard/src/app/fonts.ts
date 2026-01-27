import localFont from 'next/font/local';

export const sbAgro = localFont({
  src: [
    { path: '../../public/fonts/SBAgroL.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/SBAgroM.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/SBAgroB.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sb-agro',
  display: 'swap',
  preload: true,
});
