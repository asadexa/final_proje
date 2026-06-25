import { describe, expect, it } from 'vitest';
import {
  sanitizeBlockData,
  sanitizeRichHtml,
  sanitizeTextHtml,
} from '../src/content/html-sanitize';

describe('sanitizeTextHtml (baslik politikasi: yalniz <b>)', () => {
  it('<b> vurgusunu korur (krontech mavi vurgu)', () => {
    expect(sanitizeTextHtml('Guvenli <b>PAM</b> cozumu')).toBe(
      'Guvenli <b>PAM</b> cozumu',
    );
  });

  it('<script> enjeksiyonunu etkisizlestirir', () => {
    const out = sanitizeTextHtml('Merhaba<script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;script&gt;');
  });

  it('img onerror olay isleyicisini notrlestirir (tamamen escape, canli etiket yok)', () => {
    const out = sanitizeTextHtml('<img src=x onerror=alert(1)>');
    // Payload metni kalabilir ama tamamen escape edilmis => tarayici markup islemez.
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });

  it('baslikta <a>/<p> gibi etiketlere izin vermez (yalniz inline vurgu)', () => {
    const out = sanitizeTextHtml('<a href="javascript:alert(1)">x</a>');
    // Canli <a> etiketi olmadigi icin href semasi onemsiz; her sey escape.
    expect(out).not.toContain('<a ');
    expect(out).toContain('&lt;a');
  });
});

describe('sanitizeRichHtml (zengin metin politikasi)', () => {
  it('bicimlendirme etiketlerini korur', () => {
    const html =
      '<h2>Baslik</h2><p>Metin <b>kalin</b> ve <em>italik</em>.</p><ul><li>a</li></ul>';
    expect(sanitizeRichHtml(html)).toBe(html);
  });

  it('guvenli http(s) linkine izin verir', () => {
    const out = sanitizeRichHtml('<a href="https://krontech.com">site</a>');
    expect(out).toContain('<a href="https://krontech.com"');
    expect(out).toContain('</a>');
  });

  it('javascript: semasini href olarak reddeder (link metni kalir)', () => {
    const out = sanitizeRichHtml('<a href="javascript:alert(1)">tikla</a>');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('href=');
    expect(out).toContain('tikla');
  });

  it('<script> ve <iframe> enjeksiyonunu etkisizlestirir', () => {
    const out = sanitizeRichHtml(
      '<p>ok</p><script>steal()</script><iframe src=evil></iframe>',
    );
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<iframe');
    expect(out).toContain('<p>ok</p>');
  });

  it('mutation/uppercase kacis denemesini yakalar', () => {
    const out = sanitizeRichHtml('<SCRIPT>alert(1)</SCRIPT>');
    expect(out.toLowerCase()).not.toContain('<script');
  });
});

describe('sanitizeRichHtml — inline gorseller (blog makalesi)', () => {
  it('guvenli site-ici <img>e izin verir (yalniz src+alt+loading)', () => {
    const out = sanitizeRichHtml('<img src="/kron/blog/x.jpg" alt="resim" />');
    expect(out).toContain('<img src="/kron/blog/x.jpg"');
    expect(out).toContain('alt="resim"');
    expect(out).toContain('loading="lazy"');
  });

  it('guvenli https <img>e izin verir', () => {
    const out = sanitizeRichHtml('<img src="https://cdn.kron.com/a.png" alt="a">');
    expect(out).toContain('<img src="https://cdn.kron.com/a.png"');
  });

  it('img uzerindeki onerror/onload gibi nitelikleri ATAR (yalniz src/alt kalir)', () => {
    const out = sanitizeRichHtml('<img src="/a.jpg" onerror="alert(1)" onload="x()">');
    expect(out).toContain('<img src="/a.jpg"');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('onload');
  });

  it('javascript:/data: semali src tasiyan img tamamen dusurulur', () => {
    expect(sanitizeRichHtml('<img src="javascript:alert(1)">')).not.toContain('<img');
    expect(sanitizeRichHtml('<img src="data:text/html,<script>x</script>">')).not.toContain(
      '<img',
    );
  });

  it('<figure>/<figcaption> ile gorsel + altyazi korunur', () => {
    const out = sanitizeRichHtml(
      '<figure><img src="/kron/blog/y.jpg" alt="y" /><figcaption>Altyazi</figcaption></figure>',
    );
    expect(out).toContain('<figure>');
    expect(out).toContain('<figcaption>Altyazi</figcaption>');
    expect(out).toContain('<img src="/kron/blog/y.jpg"');
  });
});

describe('sanitizeBlockData (blok tipine gore alan eslemesi)', () => {
  it('RICH_TEXT.html alanini temizler', () => {
    const out = sanitizeBlockData('RICH_TEXT', {
      html: '<p>ok</p><script>x</script>',
    }) as { html: string };
    expect(out.html).not.toContain('<script');
  });

  it('HERO slides[].title alanlarini temizler', () => {
    const out = sanitizeBlockData('HERO', {
      title: 'Ana <b>baslik</b>',
      slides: [{ title: '<img src=x onerror=alert(1)>Slide' }],
    }) as { title: string; slides: { title: string }[] };
    expect(out.title).toBe('Ana <b>baslik</b>');
    expect(out.slides[0].title).not.toContain('<img');
  });

  it('TESTIMONIAL items[].title alanlarini temizler', () => {
    const out = sanitizeBlockData('TESTIMONIAL', {
      items: [{ title: '<b>Efes</b><script>x</script>', quote: 'q' }],
    }) as { items: { title: string }[] };
    expect(out.items[0].title).toContain('<b>Efes</b>');
    expect(out.items[0].title).not.toContain('<script');
  });

  it('HTML tasimayan alanlari (quote) degistirmez', () => {
    const out = sanitizeBlockData('TESTIMONIAL', {
      items: [{ title: 'x', quote: 'a < b degeri' }],
    }) as { items: { quote: string }[] };
    expect(out.items[0].quote).toBe('a < b degeri');
  });
});
