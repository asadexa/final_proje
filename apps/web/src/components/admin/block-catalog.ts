// Blok katalogu: kullanici-dostu ad + aciklama + hazir tasarim ornekleri (preset).
// Presetler GERCEK bilesenlerle mini-onizleme olarak render edilir (block-picker)
// ve mevcut public asset'leri kullanir -> ornekler uretim gorunumuyle birebir.
// Her preset verisi @kron/shared Zod semasini gecer (zorunlu alanlar dolu).

export interface BlockPreset {
  name: string;
  desc?: string;
  data: Record<string, unknown>;
}

export interface BlockMeta {
  title: string; // kullanici-dostu ad
  desc: string; // tek cumle: ne ise yarar
  presets: BlockPreset[];
}

export const BLOCK_CATALOG: Record<string, BlockMeta> = {
  HERO: {
    title: "Kahraman Alanı (Hero)",
    desc: "Sayfanın en üstündeki büyük tanıtım bölümü: başlık, alt metin, buton ve arka plan görseli.",
    presets: [
      {
        name: "Koyu zemin + buton",
        desc: "Ana sayfa tarzı, mavi vurgulu başlık",
        data: {
          eyebrow: "YENİ",
          title: "Kritik altyapınızı <b>tek platformdan</b> koruyun",
          subtitle: "Başlık altı kısa açıklama metni — değer önermenizi bir cümlede özetleyin.",
          cta: { label: "Demo Talep Et", href: "/tr/contact" },
        },
      },
      {
        name: "Ürün banner'ı",
        desc: "Ürün sayfası tarzı: görselli zemin + 2 buton",
        data: {
          variant: "product",
          title: "Ürün Adı",
          subtitle: "Ürünün ne yaptığını anlatan lead cümlesi.",
          image: { url: "/kron/products/kron-pam/hero.jpg", alt: "" },
          buttons: [
            { label: "Doküman İndir", href: "" },
            { label: "Demo Talep Et", href: "/tr/contact" },
          ],
        },
      },
      {
        name: "Sade başlık",
        desc: "Yalnız başlık + alt metin",
        data: { title: "Sayfa Başlığı", subtitle: "Kısa açıklama." },
      },
    ],
  },
  SECTION_HEADING: {
    title: "Bölüm Başlığı",
    desc: "İçerik bölümlerini ayıran başlık + isteğe bağlı giriş metni.",
    presets: [
      { name: "Ortalı", data: { title: "Bölüm Başlığı", intro: "Bu bölümün kısa tanıtımı.", align: "center" } },
      { name: "Sola dayalı", data: { title: "Bölüm Başlığı", align: "left" } },
    ],
  },
  FEATURE_GRID: {
    title: "Özellik Kartları",
    desc: "3 sütunlu kart ızgarası — ürün/hizmet özelliklerini listelemek için.",
    presets: [
      {
        name: "3 özellik",
        data: {
          title: "Öne Çıkan Özellikler",
          items: [
            { title: "Hızlı Kurulum", description: "Dakikalar içinde devreye alın." },
            { title: "Merkezi Yönetim", description: "Tek panelden tüm erişim." },
            { title: "Uyumluluk", description: "KVKK, ISO 27001, PCI DSS." },
          ],
        },
      },
    ],
  },
  PRODUCT_SHOWCASE: {
    title: "Ürün Vitrini",
    desc: "Görselli ürün kartları karuseli — ana sayfa 'Ürünlerimiz' bölümü.",
    presets: [
      {
        name: "2 ürün kartı",
        data: {
          title: "Ürünlerimiz",
          moreLabel: "Daha Fazla",
          products: [
            { name: "Kron PAM", description: "Ayrıcalıklı erişim yönetimi.", href: "/tr/kron-pam", image: { url: "/kron/products/pam.jpg", alt: "Kron PAM" }, features: ["Oturum kaydı", "Şifre kasası"] },
            { name: "Kron DAM", description: "Veritabanı erişim yönetimi.", href: "/tr/database-access-manager", image: { url: "/kron/products/dam.png", alt: "Kron DAM" }, features: ["Erişim denetimi"] },
          ],
        },
      },
    ],
  },
  VALUE_PROP: {
    title: "Değer Önermesi",
    desc: "İki kolon: solda başlık + metin + buton, sağda görsel ('Neden Biz?' bölümü).",
    presets: [
      {
        name: "Neden Biz?",
        data: {
          title: "Neden <b>Kron</b>?",
          body: "Şirketinizin neden tercih edilmesi gerektiğini anlatan paragraf.",
          cta: { label: "Hakkımızda", href: "/tr/about" },
          image: { url: "/kron/sections/why-kron.png", alt: "" },
        },
      },
    ],
  },
  STATS: {
    title: "Sayılarla Biz",
    desc: "Büyük rakamlarla istatistik bandı (müşteri sayısı, ülke, kurulum...).",
    presets: [
      {
        name: "4 istatistik",
        data: {
          title: "Sayılarla Kron",
          items: [
            { value: "6", label: "Kıta" },
            { value: "35+", label: "Ülke" },
            { value: "200+", label: "Kurulum" },
            { value: "1500+", label: "Müşteri" },
          ],
        },
      },
    ],
  },
  CASE_STUDY: {
    title: "Başarı Hikayesi",
    desc: "Müşteri vaka çalışması: görsel + mavi vurgulu başlık + özet + buton.",
    presets: [
      {
        name: "Banka örneği",
        data: {
          title: "Lider bankaya <b>3 ayda kurulum</b>",
          excerpt: "Binlerce ayrıcalıklı hesap tek platformda denetlenir hale geldi.",
          image: { url: "/kron/sections/case-bank.png", alt: "" },
          cta: { label: "Hikayeyi Oku", href: "/tr/blog" },
        },
      },
    ],
  },
  BLOG_CAROUSEL: {
    title: "Blog Karuseli",
    desc: "Son blog yazılarını otomatik listeler (yayında gerçek yazılar görünür).",
    presets: [{ name: "Son 6 yazı", data: { title: "Güncel Kalın", limit: 6 } }],
  },
  RICH_TEXT: {
    title: "Zengin Metin",
    desc: "Serbest makale içeriği: başlıklar, paragraflar, listeler (HTML).",
    presets: [
      {
        name: "Makale iskeleti",
        data: { html: "<h2>Ara Başlık</h2><p>Paragraf metni buraya.</p><ul><li>Madde 1</li><li>Madde 2</li></ul>" },
      },
    ],
  },
  MEDIA_TEXT: {
    title: "Görsel + Metin",
    desc: "Yarı yarıya görsel ve metin — dönüşümlü dizerek ürün sayfası bölümleri kurulur.",
    presets: [
      {
        name: "Görsel sağda",
        data: {
          title: "Bölüm <b>Başlığı</b>",
          body: "Bölümü anlatan paragraf metni.",
          image: { url: "/kron/products/kron-pam/section-1.jpg", alt: "" },
          imageSide: "right",
        },
      },
      {
        name: "Görsel solda",
        data: {
          title: "Bölüm <b>Başlığı</b>",
          body: "Bölümü anlatan paragraf metni.",
          image: { url: "/kron/products/kron-pam/section-2.jpg", alt: "" },
          imageSide: "left",
        },
      },
      {
        name: "Video hikayesi (butonlu)",
        data: {
          title: "Müşteri Hikayesi",
          body: "Kısa özet metni.",
          image: { url: "/kron/products/kron-pam/case-sekerbank.jpg", alt: "" },
          imageSide: "left",
          cta: { label: "Videoyu İzle", href: "https://youtu.be/ornek" },
        },
      },
    ],
  },
  LOGO_CLOUD: {
    title: "Logo Bulutu",
    desc: "Müşteri/partner logoları şeridi — güven göstergesi.",
    presets: [
      {
        name: "2 logo",
        data: {
          title: "Bize Güvenenler",
          logos: [
            { url: "/kron/products/kron-pam/logo-efes.png", alt: "Anadolu Efes" },
            { url: "/kron/products/kron-pam/logo-turkcell.png", alt: "Turkcell" },
          ],
        },
      },
    ],
  },
  CTA_BANNER: {
    title: "Eylem Çağrısı Bandı",
    desc: "Koyu zeminli kapanış bandı: başlık + tek buton (demo/iletişim yönlendirmesi).",
    presets: [
      {
        name: "Demo çağrısı",
        data: { title: "Ürünü çalışırken görün", cta: { label: "Demo Talep Et", href: "/tr/contact" } },
      },
    ],
  },
  CONTACT_FORM: {
    title: "İletişim Formu",
    desc: "Formlar sayfasında tanımlı bir formu sayfaya gömer (gönderimler admin'e düşer).",
    presets: [
      { name: "İletişim formu", desc: "contact tanımını kullanır", data: { title: "Bize Ulaşın", formKey: "contact" } },
      { name: "Demo talebi", desc: "demo tanımını kullanır", data: { title: "Demo Talep Et", formKey: "demo" } },
    ],
  },
  FAQ: {
    title: "Sık Sorulan Sorular",
    desc: "Açılır-kapanır soru/cevap listesi — SEO ve AI aramaları (GEO) için de değerli.",
    presets: [
      {
        name: "3 soru",
        data: {
          title: "Sık Sorulan Sorular",
          items: [
            { question: "Kurulum ne kadar sürer?", answer: "Cevabı düzenleyin." },
            { question: "Hangi sistemlerle entegre olur?", answer: "Cevabı düzenleyin." },
            { question: "Fiyatlandırma nasıl?", answer: "Cevabı düzenleyin." },
          ],
        },
      },
    ],
  },
  PRODUCT_TABS: {
    title: "Ürün Sekme Çubuğu",
    desc: "Ürün sayfası üst navigasyonu: breadcrumb + ikonlu sekmeler.",
    presets: [
      {
        name: "3 sekme",
        data: {
          breadcrumb: ["Ana Sayfa", "Kategori", "Ürün"],
          tabs: [
            { label: "ÇÖZÜM", href: "#", icon: "/kron/products/tabs/tetris3x.png", active: true },
            { label: "NASIL ÇALIŞIR?", icon: "/kron/products/tabs/seo-and-web-13x.png" },
            { label: "KAYNAKLAR", icon: "/kron/products/tabs/ui-53x.png" },
          ],
        },
      },
    ],
  },
  TESTIMONIAL: {
    title: "Müşteri Referansları",
    desc: "Mavi zeminli referans slider'ı: müşteri logosu, alıntı ve görsel.",
    presets: [
      {
        name: "Logolu referans",
        data: {
          items: [
            {
              title: "Müşteri <b>başarı başlığı</b>",
              quote: "Müşterinin ürün hakkındaki alıntısı buraya.",
              author: "Ad Soyad - Ünvan",
              image: { url: "/kron/products/kron-pam/testimonial-1.jpg", alt: "" },
              logo: { url: "/kron/products/kron-pam/logo-efes.png", alt: "" },
            },
          ],
        },
      },
    ],
  },
  RESOURCE_HUB: {
    title: "Kaynaklar Hub'ı",
    desc: "Kaynaklar sayfası düzeni: banner + ortalı giriş + görselli kartlar (mavi gradyan).",
    presets: [
      {
        name: "3 kartlı hub",
        data: {
          banner: { title: "Kaynaklar", image: { url: "/kron/pages/resources/banner.jpg" }, crumbs: ["Ana Sayfa", "Kaynaklar"] },
          title: "Kaynaklar",
          intro: "Case study, blog ve datasheet içeriklerini keşfedin.",
          moreLabel: "Detaylı Bilgi",
          cards: [
            { title: "CASE STUDY'LER", description: "Gerçek kurulum hikayeleri.", image: { url: "/kron/pages/resources/card-case-studies.jpg" }, href: "/tr/case-studies" },
            { title: "BLOG", description: "Güncel yazılar.", image: { url: "/kron/pages/resources/card-blog.jpg" }, href: "/tr/blog" },
          ],
        },
      },
    ],
  },
};
