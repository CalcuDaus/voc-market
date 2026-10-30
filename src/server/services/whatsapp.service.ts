export function normalizeWaNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

export const normalizeIndoPhone = normalizeWaNumber;

export function formatIdrPlain(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function buildWaLinkToSeller(params: {
  sellerPhone: string | null | undefined;
  sellerName: string;
  orderCode: string;
  postName: string;
  quantity: number;
  agreedPrice: number;
  buyerName: string;
  buyerNotes?: string | null;
}): string | null {
  const wa = normalizeWaNumber(params.sellerPhone);
  if (!wa) return null;
  const lines = [
    `Halo Kak ${params.sellerName}, saya *${params.buyerName}* sudah membuat pesanan di VOC-Market:`,
    `• Kode Pesanan: *${params.orderCode}*`,
    `• Karya/Jasa: ${params.postName} (${params.quantity}x)`,
    `• Estimasi Total: ${formatIdrPlain(params.agreedPrice)}`
  ];
  if (params.buyerNotes) {
    lines.push(`• Catatan: ${params.buyerNotes}`);
  }
  lines.push('Mohon konfirmasi pesanan saya ya, terima kasih!');
  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildWaLinkToBuyer(params: {
  buyerPhone: string | null | undefined;
  buyerName: string;
  sellerName: string;
  orderCode: string;
  postName: string;
  status: string;
  trackUrl: string;
}): string | null {
  const wa = normalizeWaNumber(params.buyerPhone);
  if (!wa) return null;
  const isCompleted = params.status === 'completed';
  const lines = isCompleted
    ? [
        `Halo Kak ${params.buyerName}, saya *${params.sellerName}* dari VOC-Market.`,
        `Pesanan *${params.postName}* (${params.orderCode}) sudah *SELESAI* dikerjakan.`,
        `Mohon kesediaannya melihat bukti hasil pengerjaan & memberikan ulasan pengalaman kerja saya di tautan ini:`,
        params.trackUrl,
        'Terima kasih banyak atas kepercayaannya!'
      ]
    : [
        `Halo Kak ${params.buyerName}, saya *${params.sellerName}* dari VOC-Market ingin menginfokan progres pesanan *${params.orderCode}* (${params.postName}).`,
        `Status pesanan dapat dipantau di: ${params.trackUrl}`
      ];
  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
}

