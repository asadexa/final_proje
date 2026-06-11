import { describe, expect, it } from 'vitest';
import {
  checkContentHealth,
  type HealthInput,
} from '../src/content/content-health';

function base(over: Partial<HealthInput> = {}): HealthInput {
  return {
    type: 'PAGE',
    title: 'Test Sayfasi',
    excerpt: 'ozet',
    blocks: [
      {
        type: 'HERO',
        data: { title: 'Merhaba', cta: { label: 'Git', href: '/tr/contact' } },
      },
    ],
    seo: {
      metaDescription:
        'Elli karakterden uzun, makul uzunlukta bir meta aciklamasi ornegi.',
    },
    ...over,
  };
}

function codes(input: HealthInput): string[] {
  return checkContentHealth(input).map((f) => f.code);
}

describe('checkContentHealth', () => {
  it('saglikli sayfada bulgu uretmez', () => {
    expect(codes(base())).toEqual([]);
  });

  it('bloksuz icerikte error verir', () => {
    const f = checkContentHealth(base({ blocks: [] }));
    expect(f.find((x) => x.code === 'no-blocks')?.severity).toBe('error');
  });

  it('bos meta description uyarir', () => {
    expect(codes(base({ seo: {} }))).toContain('meta-desc-missing');
  });

  it('uzun meta description uyarir', () => {
    expect(
      codes(base({ seo: { metaDescription: 'x'.repeat(200) } })),
    ).toContain('meta-desc-long');
  });

  it('noindex bilincli mi diye uyarir', () => {
    const seo = { metaDescription: 'x'.repeat(60), robotsIndex: false };
    expect(codes(base({ seo }))).toContain('noindex');
  });

  it('goreli canonical error verir', () => {
    const seo = { metaDescription: 'x'.repeat(60), canonicalUrl: '/tr/sayfa' };
    const f = checkContentHealth(base({ seo }));
    expect(f.find((x) => x.code === 'canonical-relative')?.severity).toBe(
      'error',
    );
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
    const f = checkContentHealth(base({ blocks }));
    const finding = f.find((x) => x.code === 'img-alt-missing');
    expect(finding).toBeDefined();
    expect(finding?.where).toContain('products.0.image');
  });

  it('CTA olmayan sayfada uyarir, POST icin uyarmaz', () => {
    const blocks = [{ type: 'RICH_TEXT', data: { html: '<p>metin</p>' } }];
    expect(codes(base({ blocks }))).toContain('no-cta');
    expect(codes(base({ type: 'POST', blocks }))).not.toContain('no-cta');
  });

  it('FAQ olmayan urunde GEO onerisi verir', () => {
    expect(codes(base({ type: 'PRODUCT' }))).toContain('no-faq');
  });

  it('RICH_TEXT icindeki h1 cift-h1 riskini yakalar', () => {
    const blocks = [
      { type: 'HERO', data: { title: 'T', cta: { label: 'G', href: '/x' } } },
      { type: 'RICH_TEXT', data: { html: '<h1>Yanlis</h1><p>icerik</p>' } },
    ];
    expect(codes(base({ blocks }))).toContain('rich-text-h1');
  });

  it('ozetsiz POST uyarir', () => {
    expect(codes(base({ type: 'POST', excerpt: '' }))).toContain(
      'excerpt-missing',
    );
  });
});
