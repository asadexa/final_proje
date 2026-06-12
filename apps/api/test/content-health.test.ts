import { describe, expect, it } from 'vitest';
import {
  checkContentHealth,
  type HealthInput,
} from '../src/content/content-health';

// Tum kontrolleri GECEN saglikli bir sayfa (ilk test bunda sifir bulgu bekler).
function base(over: Partial<HealthInput> = {}): HealthInput {
  return {
    type: 'PAGE',
    title: 'Kurumsal Siber Güvenlik Çözümleri',
    excerpt: 'ozet',
    blocks: [
      {
        type: 'HERO',
        data: {
          title: 'Merhaba dünya',
          cta: { label: 'İletişime geçin', href: '/tr/contact' },
        },
      },
      { type: 'SECTION_HEADING', data: { title: 'Neden biz' } },
      {
        type: 'RICH_TEXT',
        data: {
          html:
            '<p>Bu paragraf yeterince uzun bir govde metni icerir ve otuz kelimeyi rahatca gecmesi icin ' +
            'birkac cumle daha eklenmistir boylece ince icerik uyarisi tetiklenmez ve okuyucuya gercek bir deger sunar.</p>',
        },
      },
      {
        type: 'FAQ',
        data: { items: [{ question: 'Soru?', answer: 'Cevap metni.' }] },
      },
    ],
    seo: {
      metaTitle: 'Kurumsal Siber Güvenlik Çözümleri | Kron',
      metaDescription:
        'Elli karakterden uzun, makul uzunlukta bir meta aciklamasi ornegi buraya yazildi.',
      ogTitle: 'Kron Siber Güvenlik',
      ogDescription: 'Sosyal paylasim aciklamasi.',
    },
    ...over,
  };
}

function codes(input: HealthInput): string[] {
  return checkContentHealth(input).findings.map((f) => f.code);
}

describe('checkContentHealth', () => {
  it('tum kontrolleri gecen sayfada bulgu uretmez ve skor 100', () => {
    const r = checkContentHealth(base());
    expect(r.findings).toEqual([]);
    expect(r.score).toBe(100);
    expect(r.summary.passed).toBeGreaterThan(0);
    expect(r.summary.total).toBe(r.summary.passed);
  });

  it('bloksuz icerikte error verir + skor dusurur', () => {
    const r = checkContentHealth(base({ blocks: [] }));
    expect(r.findings.find((x) => x.code === 'has-blocks')?.severity).toBe(
      'error',
    );
    expect(r.score).toBeLessThan(100);
  });

  it('bos meta description warning verir', () => {
    const r = checkContentHealth(base({ seo: { metaDescription: '' } }));
    const f = r.findings.find((x) => x.code === 'meta-desc');
    expect(f?.severity).toBe('warning');
    expect(f?.category).toBe('seo');
  });

  it('uzun meta description uyarir', () => {
    const f = checkContentHealth(
      base({ seo: { metaDescription: 'x'.repeat(200) } }),
    ).findings.find((x) => x.code === 'meta-desc');
    expect(f?.message).toContain('uzun');
  });

  it('kisa baslik info verir (yeni kural)', () => {
    const f = checkContentHealth(
      base({ seo: { metaTitle: 'Kron', metaDescription: 'x'.repeat(60) } }),
    ).findings.find((x) => x.code === 'meta-title');
    expect(f?.severity).toBe('info');
    expect(f?.message).toContain('kısa');
  });

  it('OG alanlari eksikse info verir (yeni kural)', () => {
    expect(codes(base({ seo: { metaDescription: 'x'.repeat(60) } }))).toContain(
      'og-fields',
    );
  });

  it('ince icerik uyarir (yeni kural)', () => {
    const blocks = [
      {
        type: 'HERO',
        data: { title: 'Tek', cta: { label: 'Git', href: '/x' } },
      },
    ];
    expect(codes(base({ blocks }))).toContain('thin-content');
  });

  it('noindex bilincli mi diye uyarir', () => {
    expect(
      codes(
        base({ seo: { metaDescription: 'x'.repeat(60), robotsIndex: false } }),
      ),
    ).toContain('indexable');
  });

  it('goreli canonical error verir', () => {
    const f = checkContentHealth(
      base({
        seo: { metaDescription: 'x'.repeat(60), canonicalUrl: '/tr/sayfa' },
      }),
    ).findings.find((x) => x.code === 'canonical');
    expect(f?.severity).toBe('error');
  });

  it('alt metinsiz gorseli ic ice veride bile bulur', () => {
    const blocks = [
      {
        type: 'PRODUCT_SHOWCASE',
        data: {
          products: [{ name: 'P', href: '/x', image: { url: '/a.jpg' } }],
        },
      },
    ];
    const f = checkContentHealth(base({ blocks })).findings.find(
      (x) => x.code === 'img-alt',
    );
    expect(f).toBeDefined();
    expect(f?.where).toContain('products.0.image');
    expect(f?.category).toBe('a11y');
  });

  it('CTA olmayan sayfada uyarir, POST icin uyarmaz', () => {
    const blocks = [{ type: 'RICH_TEXT', data: { html: '<p>metin</p>' } }];
    expect(codes(base({ blocks }))).toContain('cta');
    expect(codes(base({ type: 'POST', blocks }))).not.toContain('cta');
  });

  it('FAQ olmayan SAYFADA da GEO onerisi verir (kapsam genisledi)', () => {
    const blocks = [
      { type: 'HERO', data: { title: 'T', cta: { label: 'G', href: '/x' } } },
    ];
    expect(codes(base({ type: 'PAGE', blocks }))).toContain('faq');
    expect(codes(base({ type: 'PRODUCT', blocks }))).toContain('faq');
  });

  it('RICH_TEXT icindeki h1 cift-h1 riskini yakalar', () => {
    const blocks = [
      { type: 'HERO', data: { title: 'T', cta: { label: 'G', href: '/x' } } },
      { type: 'RICH_TEXT', data: { html: '<h1>Yanlis</h1><p>icerik</p>' } },
    ];
    expect(codes(base({ blocks }))).toContain('rich-text-h1');
  });

  it('ozetsiz POST uyarir', () => {
    expect(codes(base({ type: 'POST', excerpt: '' }))).toContain('excerpt');
  });

  it('kategori kirilimi ve gecen kontroller doner', () => {
    const r = checkContentHealth(base());
    expect(r.categories.length).toBeGreaterThan(0);
    expect(r.categories.every((c) => c.score === 100)).toBe(true);
    expect(r.passed.some((p) => p.category === 'seo')).toBe(true);
  });
});
