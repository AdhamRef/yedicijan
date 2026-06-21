from pathlib import Path
root = Path('/mnt/data/yedi-cihan-tailwind')
IMG = {
    'hero': 'https://scontent.fist7-1.fna.fbcdn.net/v/t39.30808-6/488181220_122176481084305260_5255618954565814911_n.jpg?stp=dst-jpg_tt6&cstp=mx2460x936&ctp=s2460x936&_nc_cat=111&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=WydGqedbIgEQ7kNvwHSsX0B&_nc_oc=Adry69rbQCwFZxRFkXseN0p4kME6b4sdddjk2nc9v_mF-bp595JJNoWnkzTXnCQYF9nxM0tr4DZJXXbIfUfKwwBr&_nc_zt=23&_nc_ht=scontent.fist7-1.fna&_nc_gid=72kheFrwoPnHiFQd4MJ-nQ&_nc_ss=7b2a8&oh=00_Af8x_nsrCB1Zh0htQxtkeQGTUXtdjX2SuGX2arze7z8pOQ&oe=6A2A0AEB',
    'gazze': 'https://scontent.fist20-1.fna.fbcdn.net/v/t39.30808-6/641592449_122221741640305260_7694643118799035908_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=104&ccb=1-7&_nc_sid=127cfc&_nc_ohc=xx5Qtc40St0Q7kNvwGrokMx&_nc_oc=Adop6XQFx9UBIaCL01dkIJ1VU5hztz7YU50xfmG0o22ojr4icT3rKyTgfdsMJUPsVf1pfKyojSZG_P6LAdqadOI3&_nc_zt=23&_nc_ht=scontent.fist20-1.fna&_nc_gid=qJOYRFxm8S-AdT8rK4cfdg&_nc_ss=7b2a8&oh=00_Af9tkDINM6iV5Av-nFa4L3i914Z7vno9VHnb51y6LnOO3A&oe=6A2A11F1',
    'sudan': 'https://scontent.fist20-2.fna.fbcdn.net/v/t39.30808-6/643873520_122222189720305260_7434180672795792862_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=aVlqiS410REQ7kNvwEnndvn&_nc_oc=AdpuEsbhU4IMCEfFBE3rH6xY0UEDeNC75Km78_DeDgRfHMO3zTVrOIQxNaD-0ftkYcRv4YpEjklikxjt1yGcNS9o&_nc_zt=23&_nc_ht=scontent.fist20-2.fna&_nc_gid=xWIOFxcJWKeUnfIMfne4hA&_nc_ss=7b2a8&oh=00_Af9dvymgIyxYBB4VCcBXkLp4ZI6ucKoEUO0o7dGmwS2KpA&oe=6A2A01E7',
    'zekat': 'https://scontent.fist7-2.fna.fbcdn.net/v/t39.30808-6/640058912_122221495952305260_5642274063703312253_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_ohc=wHf_ddxrQ2UQ7kNvwEFR3FM&_nc_oc=Ado3xgNfm5cCRO2dQTpV7xt46DXhRTdiW-DeNr1fbY1VkHDanTHFQuhjXZXRbKaa85ewEvI5gfpsHt5wFmfx4BNV&_nc_zt=23&_nc_ht=scontent.fist7-2.fna&_nc_gid=VT1xjS9sOvHE_9f3UELbtw&_nc_ss=7b2a8&oh=00_Af-kYSsl_DqQqZHUZKNiJPiPsJFU-sTpaKv3FOU8VbbOHA&oe=6A2A173F',
    'gida': 'https://scontent.fist7-2.fna.fbcdn.net/v/t39.30808-6/626945051_122219468684305260_658209799827043669_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=103&ccb=1-7&_nc_sid=127cfc&_nc_ohc=REYp1BI7TrwQ7kNvwEbbFz3&_nc_oc=AdrVSVXFhF2jTn0fYjRVptAcuYivj9CliOQW6Gmelo0uYT2F-JzHhlhI6ia5CWeW5rTgOiAUrH007bYvNo7SbNfH&_nc_zt=23&_nc_ht=scontent.fist7-2.fna&_nc_gid=rYwyi8P8QGCJjURk6fvydA&_nc_ss=7b2a8&oh=00_Af8p4ufJ5-9MAjVJA1DP3IPadoP4-eWtPFBq1sSpEqh8ig&oe=6A2A0BBF',
    'yetim': 'https://scontent.fist7-1.fna.fbcdn.net/v/t39.30808-6/626988294_122219468630305260_3359805357491696658_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=106&ccb=1-7&_nc_sid=127cfc&_nc_ohc=pPvNOG4QqvUQ7kNvwE1fgz7&_nc_oc=Adqw8QfIli2bjpwycMqikRchR3jfu7cXxrmOMM39ZWQFfhMjx2SDWqfgRfsYDzR24ChV4kdwAYBx8ZwmgYxqAq6q&_nc_zt=23&_nc_ht=scontent.fist7-1.fna&_nc_gid=bA_ET_Bhby-fXEYP5eHfMQ&_nc_ss=7b2a8&oh=00_Af82JMLZKWHCMf65uRfyCkqTsC1O4iDNvdc4HGhjP0ppiw&oe=6A2A0107',
    'campaign': 'https://scontent.fist7-2.fna.fbcdn.net/v/t39.30808-6/491709770_122178005018305260_8917116282063773344_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=102&ccb=1-7&_nc_sid=127cfc&_nc_ohc=erXuZoZ3QvUQ7kNvwGNjJcG&_nc_oc=AdqDz_bziqX8Bmy2LNryP9b2ZOGGo0c7xl8zlrgyzif6cSDg7TDFecfZXlYCIsNik5zs1HjSOF1D6HeEui9L7qxN&_nc_zt=23&_nc_ht=scontent.fist7-2.fna&_nc_gid=66YrHrCIQrnzec2mALbdVg&_nc_ss=7b2a8&oh=00_Af8SnGwnjtQEAjieXxUd7u4A6j08FA1tKMebVRMQET-Jrw&oe=6A2A18F5',
    'news': 'https://scontent.fist20-1.fna.fbcdn.net/v/t39.30808-6/489031209_122175508442305260_4956562244293212082_n.jpg?stp=dst-jpg_tt6&cstp=mx1080x1350&ctp=s1080x1350&_nc_cat=104&ccb=1-7&_nc_sid=127cfc&_nc_ohc=fHViPVZP3CAQ7kNvwEI9jG6&_nc_oc=AdoO4-rfWgaqenmi4CS2OJRj0G1kX-VhUkD3OtDKsfzpdsu6F9hMucYc6u2f8xG-QM-ZXF2zKshIizs9vOsdLmtV&_nc_zt=23&_nc_ht=scontent.fist20-1.fna&_nc_gid=yL3W9H3-hf2e9lVThBfa6g&_nc_ss=7b2a8&oh=00_Af-3wFdgRIomxUQNZ5CPjAFSr2FRX0KiCpsmDD1vWL0R5w&oe=6A2A09DE'
}
projects = [
    ('Acil', 'Gazze Acil Yardım', ['250₺','500₺','1000₺'], 'gazze'),
    ('Barınma', 'Sudan Çadır Projesi', ['1000₺','2500₺','5000₺'], 'sudan'),
    ('Zekat', 'Zekat Bağışı', ['500₺','1000₺','2500₺'], 'zekat'),
    ('Gıda', 'Gıda Paketi', ['250₺','750₺','1500₺'], 'gida'),
    ('Yetim', 'Yetim Desteği', ['300₺','600₺','1200₺'], 'yetim'),
    ('Sağlık', 'Sağlık Yardımı', ['250₺','850₺','1700₺'], 'campaign'),
]

def head(title):
    return f'''<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | Yedi Cihan</title>
  <meta name="description" content="Yedi Cihan Uluslararası Yardımlaşma Derneği frontend UI." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="assets/tailwind.config.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/styles.css" />
</head>
<body>
'''

def logo():
    return '''<a href="index.html" class="flex flex-col leading-none">
      <span class="text-2xl font-extrabold tracking-tight">YediCihan <span class="align-top rounded bg-burgundy px-1.5 py-0.5 text-[10px] text-white">1961</span></span>
      <span class="mt-1 text-[9px] font-medium tracking-[.22em] opacity-80">ULUSLARARASI YARDIMLAŞMA DERNEĞİ</span>
    </a>'''

def header(dark=True):
    tone = 'text-white bg-deep' if dark else 'text-textdark bg-white/95'
    return f'''<header class="sticky top-0 z-50 {tone} backdrop-blur border-b border-white/10">
  <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
    {logo()}
    <nav class="hidden items-center gap-8 text-sm font-medium lg:flex">
      <a href="donation.html" class="hover:text-gold">Bağış Yap</a>
      <a href="projects.html" class="hover:text-gold">Projeler</a>
      <a href="trust.html" class="hover:text-gold">Kurumsal</a>
      <a href="reports.html" class="hover:text-gold">Raporlar</a>
      <a href="bank-faq.html" class="hover:text-gold">İletişim</a>
    </nav>
    <div class="hidden items-center gap-4 lg:flex">
      <span class="text-xs opacity-80">TR / AR / EN</span>
      <a href="donation.html" class="shape-button bg-burgundy px-5 py-3 text-sm font-semibold text-white shadow-soft">Hemen Bağış Yap</a>
    </div>
    <button data-menu-button="#mobile-menu" class="shape-button bg-burgundy px-4 py-2 text-sm font-semibold text-white lg:hidden">Menü</button>
  </div>
  <div id="mobile-menu" class="mobile-menu border-t border-white/10 px-5 py-4 lg:hidden">
    <div class="grid gap-3 text-sm font-medium">
      <a href="donation.html">Bağış Yap</a><a href="projects.html">Projeler</a><a href="trust.html">Kurumsal</a><a href="reports.html">Raporlar</a><a href="bank-faq.html">İletişim</a>
    </div>
  </div>
</header>'''

def footer():
    return f'''<footer class="bg-deep text-white">
  <div class="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.3fr_.7fr_.7fr_.7fr_.7fr] lg:px-8">
    <div>
      <div class="gold-mark mb-6"></div>
      {logo()}
      <p class="mt-6 max-w-sm text-sm leading-7 text-ice">Kamu yararına dernek olarak bağış süreçlerinde güven, şeffaflık ve sorumluluk ilkeleriyle hareket ederiz.</p>
    </div>
    <div><h4 class="font-bold">Bağış</h4><ul class="mt-5 space-y-3 text-sm text-ice"><li><a href="donation.html">Hemen Bağış Yap</a></li><li><a href="projects.html">Projeler</a></li><li><a href="donation.html">Zekat</a></li></ul></div>
    <div><h4 class="font-bold">Kurumsal</h4><ul class="mt-5 space-y-3 text-sm text-ice"><li><a href="trust.html">Güven</a></li><li><a href="reports.html">Raporlar</a></li><li><a href="bank-faq.html">KVKK</a></li></ul></div>
    <div><h4 class="font-bold">Destek</h4><ul class="mt-5 space-y-3 text-sm text-ice"><li><a href="bank-faq.html">SSS</a></li><li><a href="bank-faq.html">Banka Hesapları</a></li><li><a href="bank-faq.html">İletişim</a></li></ul></div>
    <div><h4 class="font-bold">Sosyal</h4><ul class="mt-5 space-y-3 text-sm text-ice"><li><a href="https://www.facebook.com/yedicihan">Facebook TR</a></li><li><a href="https://www.facebook.com/yedicihan.org.ar">Facebook AR</a></li><li><a href="https://yedicihan.org/">Website</a></li></ul></div>
  </div>
  <div class="border-t border-white/10 py-5 text-center text-xs text-ice">© 2026 Yedi Cihan. Resmi kayıtlı kamu yararına dernek.</div>
</footer>'''

def project_card(cat, title, amounts, key):
    chips = ''.join([f'<button data-amount class="shape-chip border px-3 py-2 text-xs font-semibold {"border-burgundy bg-burgundy text-white" if i==1 else "border-gray-200 bg-white text-textdark"}">{amt}</button>' for i, amt in enumerate(amounts)])
    return f'''<article class="project-card shape-card overflow-hidden bg-white shadow-soft">
  <div class="relative h-64 overflow-hidden">
    <img src="{IMG[key]}" alt="{title}" class="cover-img" referrerpolicy="no-referrer" />
    <div class="image-overlay absolute inset-x-0 bottom-0 h-28"></div>
    <span class="absolute left-5 top-5 text-xs font-bold text-white">{cat}</span>
    <div class="absolute bottom-6 left-5 right-5">
      <div class="gold-mark mb-3"></div>
      <h3 class="text-2xl font-extrabold leading-tight text-white">{title}</h3>
    </div>
  </div>
  <div class="space-y-4 p-5">
    <p class="text-xs font-semibold text-muted">Önerilen tutarlar</p>
    <div data-amount-group class="grid grid-cols-3 gap-2">{chips}</div>
    <div class="flex items-center justify-between pt-2">
      <a href="campaign-detail.html" class="shape-button border border-gray-200 px-4 py-2 text-sm font-semibold text-navy">Detay</a>
      <a href="donation.html" class="shape-button bg-burgundy px-5 py-2.5 text-sm font-semibold text-white">Bağış Yap</a>
    </div>
  </div>
</article>'''

def quick_donation():
    return '''<div class="shape-card bg-white p-6 shadow-lift" data-amount-group>
  <div class="mb-5 flex items-center justify-between"><h3 class="text-xl font-bold text-deep">Hızlı Bağış</h3><div class="gold-mark"></div></div>
  <label class="text-sm font-semibold text-muted">Bağış alanı</label>
  <div class="mt-3 grid grid-cols-3 gap-2"><button class="shape-chip bg-burgundy px-3 py-2 text-sm font-semibold text-white">Gazze</button><button class="shape-chip border border-gray-200 px-3 py-2 text-sm font-semibold">Zekat</button><button class="shape-chip border border-gray-200 px-3 py-2 text-sm font-semibold">Gıda</button></div>
  <label class="mt-5 block text-sm font-semibold text-muted">Tutar</label>
  <div class="mt-3 grid grid-cols-3 gap-2"><button data-amount class="shape-chip border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">250₺</button><button data-amount class="shape-chip border border-burgundy bg-burgundy px-3 py-2 text-sm font-semibold text-white">500₺</button><button data-amount class="shape-chip border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">1000₺</button></div>
  <a href="donation.html" class="shape-button mt-6 block bg-burgundy px-5 py-3 text-center font-semibold text-white">Güvenli Bağış Yap</a>
</div>'''

def end():
    return '<script src="assets/app.js"></script>\n</body>\n</html>\n'

index = head('Ana Sayfa') + header(True) + f'''
<main>
  <section class="hero-pattern text-white">
    <div class="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_.85fr] lg:px-8 lg:py-28">
      <div>
        <span class="shape-chip bg-burgundy px-4 py-2 text-xs font-bold">Resmi kayıtlı kamu yararına dernek</span>
        <h1 class="mt-8 max-w-3xl text-5xl font-extrabold leading-tight lg:text-7xl">Yedi Cihan ile iyiliği güvenle ulaştırın</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-ice">Acil yardım, zekat, gıda, barınma, sağlık, yetim ve kurban desteklerinizi ihtiyaç sahiplerine ulaştırın.</p>
        <div class="mt-9 flex flex-wrap gap-4"><a href="donation.html" class="shape-button bg-burgundy px-6 py-4 font-semibold text-white">Hemen Bağış Yap</a><a href="projects.html" class="shape-button bg-white px-6 py-4 font-semibold text-deep">Projeleri İncele</a></div>
        <div class="mt-12 grid max-w-2xl grid-cols-3 gap-4 text-sm"><div><b class="block text-lg">1961’den beri</b><span class="text-ice">Köklü iyilik mirası</span></div><div><b class="block text-lg">Kamu yararına</b><span class="text-ice">Resmi kayıtlı dernek</span></div><div><b class="block text-lg">Güvenli bağış</b><span class="text-ice">Şeffaf süreç</span></div></div>
      </div>
      <div class="relative">
        <div class="shape-card-alt overflow-hidden bg-navy shadow-lift"><img src="{IMG['hero']}" alt="Yedi Cihan yardım çalışmaları" class="h-[390px] w-full object-cover" referrerpolicy="no-referrer" /></div>
        <div class="absolute -bottom-10 left-8 right-8">{quick_donation()}</div>
      </div>
    </div>
  </section>
  <section class="mx-auto max-w-7xl px-5 py-24 lg:px-8">
    <div class="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div class="gold-mark mb-4"></div><h2 class="text-4xl font-extrabold text-deep">Öne çıkan yardım alanları</h2><p class="mt-3 text-muted">Bağış alanını seçin, önerilen tutarı belirleyin ve güvenle destek olun.</p></div><a href="projects.html" class="shape-button bg-deep px-5 py-3 font-semibold text-white">Tüm projeler</a></div>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{''.join(project_card(*p) for p in projects[:6])}</div>
  </section>
  <section class="bg-white py-20"><div class="mx-auto grid max-w-7xl gap-6 px-5 lg:grid-cols-4 lg:px-8">{''.join([f'<div class="shape-card bg-offwhite p-6"><div class="gold-mark mb-5"></div><h3 class="text-xl font-bold text-deep">{h}</h3><p class="mt-3 text-sm leading-7 text-muted">{b}</p></div>' for h,b in [('Güvenli ödeme','Kart ve banka destekli bağış altyapısı.'),('Şeffaf süreç','Bağış süreci ve bilgilendirme akışı.'),('Kamu yararına','Resmi kayıtlı kamu yararına dernek vurgusu.'),('Saha çalışmaları','Saha fotoğrafları ve raporlarla görünür etki.')]])}</div></section>
</main>
''' + footer() + end()
(root/'index.html').write_text(index, encoding='utf-8')

projects_html = head('Projeler') + header(False) + f'''
<main class="bg-offwhite">
  <section class="bg-deep py-20 text-white"><div class="mx-auto max-w-7xl px-5 lg:px-8"><div class="gold-mark mb-6"></div><h1 class="text-5xl font-extrabold">Projeler</h1><p class="mt-5 max-w-2xl text-lg leading-8 text-ice">Acil yardım, gıda, zekat, yetim, sağlık ve barınma desteklerini tek katalogda inceleyin.</p></div></section>
  <section class="mx-auto max-w-7xl px-5 py-12 lg:px-8">
    <div class="shape-card mb-8 flex flex-wrap gap-3 bg-white p-5"><button class="shape-chip bg-burgundy px-4 py-2 text-sm font-semibold text-white">Tümü</button><button class="shape-chip border border-gray-200 px-4 py-2 text-sm font-semibold">Acil Yardım</button><button class="shape-chip border border-gray-200 px-4 py-2 text-sm font-semibold">Zekat</button><button class="shape-chip border border-gray-200 px-4 py-2 text-sm font-semibold">Gıda</button><button class="shape-chip border border-gray-200 px-4 py-2 text-sm font-semibold">Yetim</button></div>
    <div class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{''.join(project_card(*p) for p in projects)}</div>
  </section>
</main>
''' + footer() + end()
(root/'projects.html').write_text(projects_html, encoding='utf-8')

donation_html = head('Bağış Yap') + header(False) + f'''
<main class="bg-offwhite">
  <section class="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_420px] lg:px-8">
    <div class="shape-card bg-white p-8">
      <div class="gold-mark mb-5"></div><h1 class="text-4xl font-extrabold text-deep">Güvenli Bağış Yap</h1><p class="mt-3 text-muted">Bağış bilgilerinizi girin, tutarı seçin ve güvenli ödeme adımına geçin.</p>
      <form class="mt-8 grid gap-5">
        <div><label class="text-sm font-semibold text-muted">Bağış türü</label><div class="mt-3 grid grid-cols-3 gap-2"><button type="button" class="shape-chip bg-burgundy px-4 py-3 text-sm font-semibold text-white">Tek seferlik</button><button type="button" class="shape-chip border border-gray-200 px-4 py-3 text-sm font-semibold">Aylık</button><button type="button" class="shape-chip border border-gray-200 px-4 py-3 text-sm font-semibold">Hediye</button></div></div>
        <div data-amount-group><label class="text-sm font-semibold text-muted">Tutar</label><div class="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5"><button type="button" data-amount class="shape-chip border border-gray-200 px-4 py-3 font-semibold">250₺</button><button type="button" data-amount class="shape-chip border border-burgundy bg-burgundy px-4 py-3 font-semibold text-white">500₺</button><button type="button" data-amount class="shape-chip border border-gray-200 px-4 py-3 font-semibold">1000₺</button><button type="button" data-amount class="shape-chip border border-gray-200 px-4 py-3 font-semibold">2500₺</button><input class="shape-chip border border-gray-200 px-4 py-3" placeholder="Diğer" /></div></div>
        <div class="grid gap-4 md:grid-cols-2"><input class="shape-chip border border-gray-200 px-4 py-3" placeholder="Ad Soyad" /><input class="shape-chip border border-gray-200 px-4 py-3" placeholder="Telefon" /></div>
        <input class="shape-chip border border-gray-200 px-4 py-3" placeholder="E-posta adresiniz" />
        <label class="flex gap-3 text-sm text-muted"><input type="checkbox" class="mt-1" /> KVKK ve bağış şartlarını okudum, kabul ediyorum.</label>
        <a href="success.html" class="shape-button bg-burgundy px-6 py-4 text-center font-semibold text-white">Güvenli Ödeme Yap</a>
      </form>
    </div>
    {quick_donation()}
  </section>
</main>
''' + footer() + end()
(root/'donation.html').write_text(donation_html, encoding='utf-8')

campaign_html = head('Gazze Acil Yardım') + header(True) + f'''
<main>
  <section class="hero-pattern text-white"><div class="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1fr_.85fr] lg:px-8">
    <div><span class="shape-chip bg-burgundy px-4 py-2 text-xs font-bold">Acil Yardım</span><h1 class="mt-8 text-5xl font-extrabold leading-tight lg:text-6xl">Gazze Acil Yardım Kampanyası</h1><p class="mt-6 max-w-2xl text-lg leading-8 text-ice">Gıda, hijyen ve temel ihtiyaç desteklerini güvenle ihtiyaç sahiplerine ulaştırıyoruz.</p><div class="mt-8 flex gap-4"><a href="donation.html" class="shape-button bg-burgundy px-6 py-4 font-semibold text-white">Hemen Bağış Yap</a><a href="#process" class="shape-button bg-white px-6 py-4 font-semibold text-deep">Süreci İncele</a></div></div>
    <div class="shape-card-alt overflow-hidden bg-navy"><img src="{IMG['campaign']}" class="h-[430px] w-full object-cover" referrerpolicy="no-referrer" alt="Gazze acil yardım" /></div>
  </div></section>
  <section class="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1fr_420px] lg:px-8"><div><div class="gold-mark mb-5"></div><h2 class="text-4xl font-extrabold text-deep">Kampanya hakkında</h2><p class="mt-5 text-lg leading-8 text-muted">Bu kampanya, kriz bölgesindeki ailelerin temel ihtiyaçlarına destek olmak için hazırlanmıştır. Bağışınız saha ekipleri tarafından planlanan ihtiyaçlara göre ulaştırılır.</p></div>{quick_donation()}</section>
  <section id="process" class="bg-white py-20"><div class="mx-auto max-w-7xl px-5 lg:px-8"><h2 class="text-4xl font-extrabold text-deep">Yardım süreci</h2><div class="mt-10 grid gap-6 lg:grid-cols-4">{''.join([f'<div class="shape-card bg-offwhite p-6"><span class="text-3xl font-extrabold text-burgundy">0{i+1}</span><h3 class="mt-4 text-xl font-bold">{s}</h3><p class="mt-3 text-sm leading-7 text-muted">Süreç şeffaf ve takip edilebilir şekilde yürütülür.</p></div>' for i,s in enumerate(['Bağış alınır','İhtiyaç planlanır','Saha ekibi ulaştırır','Bilgilendirme paylaşılır'])])}</div></div></section>
</main>
''' + footer() + end()
(root/'campaign-detail.html').write_text(campaign_html, encoding='utf-8')

trust_html = head('Güven ve Şeffaflık') + header(False) + '''
<main class="bg-offwhite"><section class="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div class="gold-mark mb-5"></div><h1 class="text-5xl font-extrabold text-deep">Güven ve Şeffaflık</h1><p class="mt-5 max-w-3xl text-lg leading-8 text-muted">Resmi kayıtlı kamu yararına dernek olarak bağış süreçlerinde güven, şeffaflık ve sorumluluk ilkeleriyle hareket ederiz.</p><div class="mt-12 grid gap-6 lg:grid-cols-3"><div class="shape-card bg-white p-8"><h3 class="text-2xl font-bold text-deep">Kamu yararına</h3><p class="mt-4 text-muted">Kurumsal güven mesajı ve resmi kayıt bilgisi burada yer alır.</p></div><div class="shape-card bg-white p-8"><h3 class="text-2xl font-bold text-deep">Şeffaf süreç</h3><p class="mt-4 text-muted">Bağışın alınması, planlanması ve sahaya ulaştırılması takip edilir.</p></div><div class="shape-card bg-white p-8"><h3 class="text-2xl font-bold text-deep">Bilgilendirme</h3><p class="mt-4 text-muted">Makbuz ve bağış süreci bilgilendirmeleri paylaşılır.</p></div></div></section></main>
''' + footer() + end()
(root/'trust.html').write_text(trust_html, encoding='utf-8')

reports_html = head('Raporlar') + header(False) + f'''
<main class="bg-offwhite"><section class="bg-deep py-20 text-white"><div class="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1fr_380px] lg:px-8"><div><div class="gold-mark mb-5"></div><h1 class="text-5xl font-extrabold">Raporlar ve etki</h1><p class="mt-5 max-w-2xl text-lg leading-8 text-ice">Bağışların nasıl kullanıldığını, saha çalışmalarını ve faaliyet özetlerini inceleyin.</p></div><div class="shape-card-alt overflow-hidden"><img src="{IMG['news']}" class="h-56 w-full object-cover" referrerpolicy="no-referrer" alt="Rapor görseli" /></div></div></section><section class="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{''.join([f'<article class="shape-card bg-white p-7"><div class="gold-mark mb-5"></div><h3 class="text-2xl font-bold text-deep">{t}</h3><p class="mt-4 text-sm leading-7 text-muted">Dönem, kapsam ve indirilebilir PDF bilgisi burada yer alır.</p><a class="shape-button mt-8 inline-block bg-burgundy px-5 py-3 font-semibold text-white" href="#">İndir</a></article>' for t in ['Yıllık Faaliyet Raporu','Gazze Yardım Raporu','Zekat Dağıtım Özeti','Gıda Paketi Etki Raporu','Gönüllülük Faaliyetleri','Bağış Şeffaflık Özeti']])}</div></section></main>
''' + footer() + end()
(root/'reports.html').write_text(reports_html, encoding='utf-8')

bank_html = head('Banka Hesapları ve SSS') + header(False) + '''
<main class="bg-offwhite"><section class="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div class="gold-mark mb-5"></div><h1 class="text-5xl font-extrabold text-deep">Banka Hesapları ve SSS</h1><p class="mt-5 max-w-3xl text-lg leading-8 text-muted">Banka bilgileri ve sıkça sorulan sorular kurum tarafından doğrulandıktan sonra yayına alınmalıdır.</p><div class="mt-12 grid gap-8 lg:grid-cols-2"><div class="shape-card bg-white p-8"><h2 class="text-2xl font-bold">Banka Hesapları</h2><div class="mt-6 space-y-4"><div class="rounded-xl border p-4"><b>TRY Hesabı</b><p class="mt-2 text-sm text-muted">IBAN: TR00 0000 0000 0000 0000 0000 00</p></div><div class="rounded-xl border p-4"><b>USD / EUR Hesabı</b><p class="mt-2 text-sm text-muted">SWIFT ve hesap bilgileri buraya girilir.</p></div></div></div><div class="shape-card bg-white p-8"><h2 class="text-2xl font-bold">Sıkça Sorulan Sorular</h2><div class="mt-6 space-y-4"><details class="rounded-xl border p-4"><summary class="font-semibold">Bağış makbuzu alabilir miyim?</summary><p class="mt-3 text-sm text-muted">Evet, bağış sonrası bilgilendirme yapılır.</p></details><details class="rounded-xl border p-4"><summary class="font-semibold">Aylık bağış yapılabilir mi?</summary><p class="mt-3 text-sm text-muted">Evet, aylık bağış akışı desteklenir.</p></details></div></div></div></section></main>
''' + footer() + end()
(root/'bank-faq.html').write_text(bank_html, encoding='utf-8')

success = head('Bağış Başarılı') + header(False) + '''<main class="grid min-h-[70vh] place-items-center bg-offwhite px-5 py-20"><section class="shape-card max-w-xl bg-white p-10 text-center"><div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold text-2xl font-extrabold text-deep">✓</div><h1 class="mt-6 text-4xl font-extrabold text-deep">Bağışınız alındı</h1><p class="mt-4 text-muted">Teşekkür ederiz. Makbuz ve bilgilendirme e-posta adresinize gönderilecektir.</p><a href="index.html" class="shape-button mt-8 inline-block bg-burgundy px-6 py-3 font-semibold text-white">Ana sayfaya dön</a></section></main>''' + footer() + end()
(root/'success.html').write_text(success, encoding='utf-8')
error = head('Ödeme Tamamlanamadı') + header(False) + '''<main class="grid min-h-[70vh] place-items-center bg-offwhite px-5 py-20"><section class="shape-card max-w-xl bg-white p-10 text-center"><div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-burgundy text-2xl font-extrabold text-white">!</div><h1 class="mt-6 text-4xl font-extrabold text-deep">Ödeme tamamlanamadı</h1><p class="mt-4 text-muted">Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.</p><a href="donation.html" class="shape-button mt-8 inline-block bg-burgundy px-6 py-3 font-semibold text-white">Tekrar dene</a></section></main>''' + footer() + end()
(root/'error.html').write_text(error, encoding='utf-8')

readme = '''# Yedi Cihan Website Frontend

Static frontend implementation package built with HTML + Tailwind CSS.

## How to preview
Open `index.html` in a browser. Internet is required for Tailwind CDN, Google Fonts, and the remote Facebook image URLs.

## Pages
- `index.html` — Homepage
- `donation.html` — Donation flow UI
- `projects.html` — Projects listing
- `campaign-detail.html` — Campaign detail
- `trust.html` — Trust/About page
- `reports.html` — Reports page
- `bank-faq.html` — Bank accounts and FAQ
- `success.html` — Donation success state
- `error.html` — Payment error state

## Tech rules
- HTML5 + Tailwind CSS CDN
- No Bootstrap
- Optional migration to Next.js/shadcn is possible, but visual identity must remain the same
- Project cards are image-first: large image, title on image, no standalone red amount, suggested prices in one row

## Final content/assets to replace
- Official logo files
- Verified bank/IBAN data
- Approved KVKK/legal text
- Real project amounts if different from prototype values
- Remote image URLs can be downloaded and placed locally for production
'''
(root/'README.md').write_text(readme, encoding='utf-8')
