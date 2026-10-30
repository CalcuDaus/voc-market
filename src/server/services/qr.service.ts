import QRCode from 'qrcode';

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: 164,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}

