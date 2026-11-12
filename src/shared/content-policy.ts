export interface ContentPolicyCheckResult {
  valid: boolean;
  category?: 'pornografi' | 'sara_rasis' | 'judi_ilegal' | 'bukan_karya';
  error?: string;
  matchedTerm?: string;
}

export const SKILLHUB_POLICY_SUMMARY = [
  'Postingan WAJIB berupa karya nyata siswa SMK (portofolio, prototipe aplikasi/3D, jasa keahlian, atau produk kreatif vokasi).',
  'DILARANG KERAS mengunggah konten yang mengandung unsur SARA (Suku, Agama, Ras, dan Antargolongan), rasisme, atau ujaran kebencian.',
  'DILARANG KERAS mengunggah konten pornografi, asusila, kekerasan ekstrem, perjudian online, narkoba, atau tindakan yang melanggar Undang-Undang Republik Indonesia (UU ITE & UU Pornografi).',
  'Pelanggaran terhadap ketentuan ini akan mengakibatkan penghapusan karya (takedown) secara langsung dan pembekuan akun permanen oleh Superadmin.'
] as const;

interface RuleCategory {
  category: 'pornografi' | 'sara_rasis' | 'judi_ilegal' | 'bukan_karya';
  label: string;
  patterns: RegExp[];
}

const PROHIBITED_CONTENT_RULES: RuleCategory[] = [
  {
    category: 'pornografi',
    label: 'Pornografi / Konten Asusila (Melanggar UU Pornografi & UU ITE)',
    patterns: [
      /\b(bokep|porno|pornografi|porn|xnxx|xvideos|onlyfans|bugil|telanjang|mesum|asusila|prostitusi|open\s*bo|vcs\s*bayar|konten\s*dewasa|sex\s*toys|ngentot|memek|kontol|peju|toket|colmek|jav\s*hd|hentai\s*18)\b/i
    ]
  },
  {
    category: 'sara_rasis',
    label: 'Unsur SARA, Rasisme & Ujaran Kebencian (Melanggar UU ITE)',
    patterns: [
      /\b(rasis|rasisme|anti\s*agama|penistaan\s*agama|bakar\s*tempat\s*ibadah|usir\s*etnis|pribumi\s*bangsat|cina\s*bangsat|arab\s*bangsat|kafir\s*harbi|bunuh\s*kafir|kristenisasi\s*jahat|islamofobia|ujaran\s*kebencian|supremasi\s*ras|fasis|nazi)\b/i
    ]
  },
  {
    category: 'judi_ilegal',
    label: 'Perjudian, Narkoba & Pelanggaran Hukum Pidana',
    patterns: [
      /\b(judi\s*online|slot\s*gacor|judol|maxwin|zeus\s*slot|pragmatic\s*play|sbobet|togel\s*online|bandar\s*togel|depo\s*slot|sabu\s*sabu|ganja\s*kering|ekstasi|jual\s*narkoba|senjata\s*api\s*ilegal|jasa\s*hack\s*akun|carding|jual\s*data\s*pribadi|pinjol\s*ilegal)\b/i
    ]
  },
  {
    category: 'bukan_karya',
    label: 'Postingan Di Luar Seputar Karya Vokasi',
    patterns: [
      /\b(cari\s*pacar|cari\s*jodoh|open\s*donasi\s*pribadi|gosip\s*artis|politik\s*praktis|kampanye\s*partai|jual\s*akun\s*ff\s*murah|top\s*up\s*diamond\s*ilegal|curhat\s*galau)\b/i
    ]
  }
];

export function validateContentPolicy(
  fields: Record<string, string | null | undefined>
): ContentPolicyCheckResult {
  const combined = Object.values(fields)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' \n ');

  if (!combined.trim()) {
    return { valid: true };
  }

  for (const rule of PROHIBITED_CONTENT_RULES) {
    for (const pattern of rule.patterns) {
      const match = combined.match(pattern);
      if (match) {
        return {
          valid: false,
          category: rule.category,
          matchedTerm: match[0],
          error: `Postingan ditolak karena terdeteksi melanggar Kebijakan Skill-Hub: ${rule.label}. Skill-Hub hanya diperuntukkan bagi karya vokasi dan melarang keras unsur SARA, pornografi, rasisme, atau pelanggaran Undang-Undang.`
        };
      }
    }
  }

  return { valid: true };
}

