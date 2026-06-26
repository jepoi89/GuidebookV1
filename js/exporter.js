(function () {
  const { assetFolder, dataUrlToBytes, safeName } = window.GuidebookAssets;
  const { createZip } = window.GuidebookZip;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function lines(value = '') { return escapeHtml(value).replace(/\n/g, '<br>'); }
  function projectFolder(project) { return safeName(project.projectName || 'guidebook'); }
  function assetPath(asset) { return `assets/${assetFolder(asset)}/${asset.name}`; }
  function allAssets(project) { return [project.logo, project.banner, project.backgroundImage, ...(project.images || []), ...(project.documents || [])].filter(Boolean); }

  function renderGuidebookHtml(project, mode = 'export') {
    const p = project.property || {};
    const h = project.host || {};
    const theme = project.theme || {};
    const logoSrc = project.logo ? (mode === 'preview' ? project.logo.dataUrl : assetPath(project.logo)) : '';
    const bannerSrc = project.banner ? (mode === 'preview' ? project.banner.dataUrl : assetPath(project.banner)) : '';
    const backgroundSrc = project.backgroundImage ? (mode === 'preview' ? project.backgroundImage.dataUrl : assetPath(project.backgroundImage)) : '';
    const gallery = (project.images || []).map(img => `<figure><img src="${mode === 'preview' ? img.dataUrl : assetPath(img)}" alt="${escapeHtml(img.originalName || img.name)}"><figcaption>${escapeHtml(img.originalName || img.name)}</figcaption></figure>`).join('');
    const docs = (project.documents || []).map(doc => `<li><a href="${mode === 'preview' ? doc.dataUrl : assetPath(doc)}" download>${escapeHtml(doc.originalName || doc.name)}</a></li>`).join('');
    const pages = (project.pages || []).filter(p => p.status === 'published').map(page => `
      <article class="page-card card" data-page-id="${page.id}">
        ${page.icon ? `<div class="page-card-icon">${escapeHtml(page.icon)}</div>` : ''}
        <h3>${escapeHtml(page.title)}</h3>
        <p>${escapeHtml(page.description || '')}</p>
        <button type="button" class="button ghost">View Details</button>
      </article>
    `).join('');
    const places = (project.places || []).map(place => `<article class="place card"><p class="kicker">${escapeHtml(place.category || 'Nearby')}</p><h3>${escapeHtml(place.name)}</h3><dl><div><dt>Distance</dt><dd>${escapeHtml(place.distance || 'Add distance')}</dd></div><div><dt>Address</dt><dd>${escapeHtml(place.address || 'Address not provided')}</dd></div></dl><p>${lines(place.notes)}</p></article>`).join('');

    // Background image is applied via an inline style on <body> itself (not through
    // a CSS variable consumed by the external stylesheet) so the relative path always
    // resolves against the HTML document's own location, not the stylesheet's folder.
    const bodyStyleParts = [`--accent:${theme.accent || '#2F7D7A'}`];
    if (backgroundSrc) bodyStyleParts.push(`background-image:url('${backgroundSrc}')`);

    // The banner, if present, becomes the background image of the hero / project-info
    // section, with a glass (frosted) overlay so the logo, title, and subtitle stay readable.
    const heroStyle = bannerSrc ? ` style="background-image:url('${bannerSrc}')"` : '';
    const heroClass = bannerSrc ? 'hero hero-has-banner' : 'hero';

    const pageDataJson = JSON.stringify((project.pages || []).filter(p => p.status === 'published').map(p => ({
      id: p.id,
      title: p.title,
      icon: p.icon,
      coverImage: p.coverImage,
      description: p.description,
      contentHtml: renderPageBlocks(p.blocks)
    })));

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.title)}</title><link rel="stylesheet" href="css/style.css"></head><body style="${bodyStyleParts.join(';')}" data-layout="${escapeHtml(theme.layout || 'editorial')}" data-font="${escapeHtml(theme.fontStyle || 'mixed')}" data-corners="${escapeHtml(theme.cornerStyle || 'soft')}" data-overlay="${escapeHtml(theme.overlayStyle || 'transparent')}" data-has-bg="${backgroundSrc ? 'true' : 'false'}"><header class="${heroClass}"${heroStyle}><div class="hero-glass">${logoSrc ? `<img class="logo" src="${logoSrc}" alt="${escapeHtml(project.title)} logo">` : ''}<div><p class="kicker">${escapeHtml(project.author || h.name || 'Offline guidebook')}</p><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.subtitle || '')}</p></div></div></header><main><section class="intro card"><h2>About this guide</h2><p>${lines(project.description)}</p></section><section class="property card"><p class="kicker">About the Property</p><h2>${escapeHtml(p.name || project.title)}</h2><p>${lines(p.description)}</p><div class="fact-grid"><div><strong>Type</strong><span>${escapeHtml(p.type || 'Property')}</span></div><div><strong>Check-in</strong><span>${escapeHtml(p.checkIn || '')}</span></div><div><strong>Check-out</strong><span>${escapeHtml(p.checkOut || '')}</span></div></div>${p.address ? `<p><strong>Address:</strong> ${lines(p.address)}</p>` : ''}${p.houseRules ? `<h3>House Rules</h3><p>${lines(p.houseRules)}</p>` : ''}</section><section class="host card"><p class="kicker">About Host</p><h2>${escapeHtml(h.name || 'Your Host')}</h2><p>${lines(h.bio || 'Host details will appear here.')}</p><ul class="contact-list">${h.phone ? `<li><strong>Phone</strong> ${escapeHtml(h.phone)}</li>` : ''}${h.email ? `<li><strong>Email</strong> ${escapeHtml(h.email)}</li>` : ''}${h.contactNote ? `<li><strong>Note</strong> ${lines(h.contactNote)}</li>` : ''}</ul></section>${pages ? `<section><p class="kicker">Guidebook Pages</p><div class="page-grid">${pages}</div></section>` : ''}${places ? `<section><p class="kicker">Nearby Places</p><div class="place-grid">${places}</div></section>` : ''}${gallery ? `<section><p class="kicker">Gallery</p><div class="gallery">${gallery}</div></section>` : ''}${docs ? `<section class="card"><p class="kicker">Downloads</p><h2>Files and Documents</h2><ul class="downloads">${docs}</ul></section>` : ''}</main><footer>Generated offline with Guidebook Studio.</footer>
    <dialog id="pageModal" class="modal-viewer">
      <div class="modal-content">
        <button type="button" class="modal-close" id="closeModal">×</button>
        <div id="modalBody"></div>
      </div>
    </dialog>
    <script>window.GUIDEBOOK_PAGES = ${pageDataJson};</script>
    <script src="js/script.js"></script></body></html>`;
  }

  function renderPageBlocks(blocks) {
    return (blocks || []).map(block => {
      const c = block.content || {};
      let html = '';
      switch (block.type) {
        case 'heading':
          const align = c.align || 'left';
          html = `<${c.level || 'h2'} style="text-align:${align}">${escapeHtml(c.text)}</${c.level || 'h2'}>`;
          break;
        case 'paragraph':
          html = `<div class="block-paragraph">${c.text || ''}</div>`;
          break;
        case 'image':
          html = `<figure class="block-image">${c.url ? `<img src="${escapeHtml(c.url)}" alt="${escapeAttr(c.alt)}">` : ''}${c.caption ? `<figcaption>${escapeHtml(c.caption)}</figcaption>` : ''}</figure>`;
          break;
        case 'featureList':
          html = `<ul class="block-feature-list">${(c.items || []).map(item => `<li><span class="feature-icon">${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></div></li>`).join('')}</ul>`;
          break;
        case 'gallery':
          html = `<div class="block-gallery">${(c.images || []).map(img => `<img src="${escapeHtml(img)}">`).join('')}</div>`;
          break;
        case 'twoColumn':
          html = `<div class="block-two-column"><div>${lines(c.left)}</div><div>${lines(c.right)}</div></div>`;
          break;
        case 'cta':
          const ctaStyle = c.bgImage ? `style="background-image:linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${c.bgImage}'); background-size:cover; background-position:center; border:0;"` : '';
          html = `<div class="block-cta" ${ctaStyle}><h3>${escapeHtml(c.title)}</h3><p>${escapeHtml(c.description)}</p>${c.buttonText ? `<a href="${escapeHtml(c.buttonLink)}" class="button solid">${escapeHtml(c.buttonText)}</a>` : ''}</div>`;
          break;
        case 'custom':
          html = `<section class="block-custom">${c.title ? `<h3>${escapeHtml(c.title)}</h3>` : ''}<div>${c.html}</div></section>`;
          break;
      }
      return html ? `<div class="reveal">${html}</div>` : '';
    }).join('');
  }

  const FONT_PAIRINGS = {
    mixed: { heading: 'Georgia,"Times New Roman",serif', body: 'Aptos,"Segoe UI","Trebuchet MS",sans-serif', label: 'Mixed — serif headings, sans body' },
    serif: { heading: 'Georgia,"Times New Roman",serif', body: 'Georgia,"Times New Roman",serif', label: 'Classic Serif — editorial, traditional' },
    sans: { heading: '"Segoe UI",Aptos,"Helvetica Neue",Arial,sans-serif', body: '"Segoe UI",Aptos,"Helvetica Neue",Arial,sans-serif', label: 'Clean Sans — modern, minimal' },
    geometric: { heading: '"Trebuchet MS","Segoe UI",sans-serif', body: '"Trebuchet MS","Segoe UI",sans-serif', label: 'Geometric — friendly, rounded letterforms' },
    elegant: { heading: 'Georgia,"Palatino Linotype",serif', body: '"Helvetica Neue",Arial,sans-serif', label: 'Elegant Display — boutique, upscale' },
    technical: { heading: '"Trebuchet MS","Segoe UI",sans-serif', body: 'Consolas,"Courier New",monospace', label: 'Technical — minimal, structured' },
    rounded: { heading: 'Verdana,Tahoma,sans-serif', body: 'Verdana,Tahoma,sans-serif', label: 'Rounded — casual, approachable' }
  };

  function generatedCss(project) {
    const theme = project.theme || {};
    const layout = theme.layout || 'editorial';
    const compact = layout === 'compact';
    const directory = layout === 'directory';
    const radiusScale = theme.cornerStyle === 'square' ? 0 : theme.cornerStyle === 'pill' ? 2.2 : 1;
    const radiusSm = `${Math.round(10 * radiusScale)}px`;
    const radiusMd = `${Math.round(20 * radiusScale)}px`;
    const radiusLg = `${Math.round(30 * radiusScale)}px`;
    const fonts = FONT_PAIRINGS[theme.fontStyle] || FONT_PAIRINGS.mixed;
    const bodyFont = fonts.body;
    const headingFont = fonts.heading;
    const overlay = theme.overlayStyle === 'solid' ? 'solid' : 'transparent';
    const heroBackground = overlay === 'solid'
      ? `linear-gradient(135deg, rgba(10,20,24,.86), rgba(15,40,46,.9))`
      : `linear-gradient(135deg, rgba(19,45,54,.62) 0%, rgba(27,79,86,.55) 68%, rgba(47,125,122,.45) 100%)`;
    const mainBackdrop = overlay === 'solid'
      ? `rgba(10,20,24,.78)`
      : `rgba(248,246,239,.66)`;
    const cardBackground = overlay === 'solid' ? 'rgba(24,38,42,.72)' : '#fffdf7';
    const cardBorder = overlay === 'solid' ? 'rgba(255,255,255,.12)' : '#cdd9d5';
    const ink = overlay === 'solid' ? '#f3f1ea' : '#18272c';
    const muted = overlay === 'solid' ? '#c3cdcb' : '#5f6d6d';
    const headingColor = overlay === 'solid' ? '#f8f6ef' : '#17333a';
    const blurFilter = overlay === 'solid' ? '' : 'backdrop-filter:blur(14px) saturate(1.08);-webkit-backdrop-filter:blur(14px) saturate(1.08);';
    // Default page backdrop (gradient). When a background image is set, it is applied
    // via an inline style directly on <body> (see renderGuidebookHtml) so its relative
    // path always resolves against the HTML document, not this stylesheet's folder.
    const pageBackground = `background-color:#f4f0e8;background-image:linear-gradient(135deg,#f8f6ef 0%,#f0f4f1 48%,#e4efec 100%);background-size:cover;background-position:center;background-attachment:fixed;`;
    const mainMaxWidth = compact ? '880px' : directory ? '1280px' : '1120px';
    const mainGap = compact ? '16px' : '26px';
    const directoryColumns = directory ? 'repeat(auto-fit,minmax(280px,1fr))' : 'repeat(auto-fit,minmax(210px,1fr))';
    // Glass overlay sitting on top of the banner background inside the hero/Project
    // Information section, so the logo, title, and subtitle stay legible.
    const heroGlassBackground = overlay === 'solid'
      ? 'rgba(8,16,19,.62)'
      : 'rgba(19,45,54,.42)';

    return `*{box-sizing:border-box}
body{margin:0;font-family:${bodyFont};${pageBackground}color:${ink};line-height:1.6;min-height:100vh;background-repeat:no-repeat}
.modal-viewer{border:0;background:transparent;padding:0;width:100%;height:100%;max-width:none;max-height:none;margin:0}
.modal-viewer::backdrop{background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.modal-content{background:${cardBackground};color:${ink};width:min(900px,94vw);margin:40px auto;border-radius:${radiusLg};position:relative;max-height:calc(100vh - 80px);overflow-y:auto;box-shadow:0 30px 90px rgba(0,0,0,0.4);border:1px solid ${cardBorder};animation:modalSlideUp 0.4s cubic-bezier(0,0,0.2,1)}
@keyframes modalSlideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
.reveal{opacity:0;transform:translateY(30px);transition:all 0.8s cubic-bezier(0.2,1,0.3,1)}
.reveal.is-visible{opacity:1;transform:translateY(0)}
.modal-close{position:absolute;top:20px;right:20px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,0.05);color:${ink};font-size:24px;cursor:pointer;z-index:10;display:grid;place-items:center;transition:background 0.2s}
.modal-close:hover{background:rgba(0,0,0,0.1)}
.modal-page-header{position:relative}
.modal-cover{width:100%;height:300px;object-fit:cover;display:block}
.modal-title-area{padding:40px 40px 20px;display:flex;align-items:center;gap:20px}
.modal-icon{font-size:3rem}
.modal-title-area h1{margin:0;font-family:${headingFont};font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}
.modal-page-content{padding:0 40px 40px;line-height:1.8}
.modal-page-content p{font-size:1.1rem;margin-bottom:1.5rem}
.page-card{cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;display:flex;flex-direction:column;gap:12px;text-align:left}
.page-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,0.12)}
.page-card-icon{font-size:2.5rem;margin-bottom:4px}
.page-card h3{margin:0;font-size:1.5rem}
.page-card p{margin:0;color:${muted};font-size:0.95rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.block-image{margin:2rem 0;text-align:center}
.block-image img{max-width:100%;border-radius:${radiusMd};box-shadow:0 10px 30px rgba(0,0,0,0.1)}
.block-image figcaption{margin-top:10px;font-style:italic;color:${muted}}
.block-feature-list{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;margin:2rem 0}
.block-feature-list li{display:flex;gap:16px;align-items:flex-start;background:rgba(0,0,0,0.03);padding:20px;border-radius:${radiusMd}}
.feature-icon{font-size:1.8rem;line-height:1}
.block-feature-list li strong{display:block;font-size:1.1rem;margin-bottom:4px}
.block-feature-list li p{margin:0;font-size:0.95rem;line-height:1.5}
.block-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin:2rem 0}
.block-gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:${radiusSm}}
.block-two-column{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:2rem 0}
.block-cta{background:var(--accent);color:white;padding:40px;border-radius:${radiusLg};text-align:center;margin:3rem 0}
.block-cta h3{color:white;margin-top:0;font-size:1.8rem}
.block-cta p{color:rgba(255,255,255,0.9);font-size:1.1rem;margin-bottom:1.5rem}
.block-cta .button.solid{background:white;color:var(--accent);display:inline-block;padding:12px 30px;border-radius:${radiusSm};text-decoration:none;font-weight:bold}
.block-custom{margin:2rem 0}
@media(max-width:700px){
  .modal-content{width:100%;height:100%;max-height:none;margin:0;border-radius:0}
  .modal-title-area{padding:30px 20px 10px;flex-direction:column;align-items:flex-start}
  .modal-page-content{padding:0 20px 40px}
  .block-two-column{grid-template-columns:1fr;gap:20px}
}
a{color:var(--accent);font-weight:850}
.hero{position:relative;background:${heroBackground};background-size:cover;background-position:center;color:#fffaf0;overflow:hidden}
.hero-has-banner{background-size:cover;background-position:center}
.hero-glass{position:relative;z-index:1;display:flex;gap:20px;align-items:center;padding:46px clamp(18px,6vw,76px)}
.hero-has-banner::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg, rgba(19,45,54,.5) 0%, rgba(27,79,86,.4) 100%)}
.hero-has-banner .hero-glass{background:${heroGlassBackground};backdrop-filter:blur(16px) saturate(1.1);-webkit-backdrop-filter:blur(16px) saturate(1.1);margin:22px;border-radius:${radiusLg};border:1px solid rgba(255,255,255,.18);box-shadow:0 20px 60px rgba(0,0,0,.22)}
.logo{width:76px;height:76px;object-fit:contain;border-radius:${radiusSm};background:#fffdf7;box-shadow:0 14px 34px rgba(0,0,0,.18)}
.kicker{text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font:.68rem sans-serif;font-weight:850}
.hero .kicker{color:#d9c991}
.hero h1{font-family:${headingFont};font-size:clamp(2.2rem,6vw,5rem);line-height:.95;margin:.2rem 0}
.hero p{max-width:780px;color:#e9f2ef}
main{width:min(${mainMaxWidth},calc(100% - 32px));margin:34px auto;display:grid;gap:${mainGap};${directory ? 'grid-template-columns:1fr;' : ''}background:${mainBackdrop};${blurFilter}border-radius:${radiusLg};padding:${compact ? '14px' : '22px'};${overlay === 'transparent' ? 'box-shadow:0 30px 80px rgba(15,42,48,.1);' : ''}}
section,.card{background:${cardBackground};border:1px solid ${cardBorder};border-radius:${directory ? radiusSm : radiusMd};padding:clamp(18px,4vw,34px);box-shadow:0 18px 50px rgba(15,42,48,.08);${blurFilter}}
h2,h3{font-family:${headingFont};line-height:1.05;color:${headingColor}}
h2{margin-top:0;font-size:clamp(1.5rem,3vw,2.3rem)}
h3{margin:.3rem 0}
p{color:${ink}}
.fact-grid,.page-grid,.place-grid,.gallery{display:grid;grid-template-columns:${directoryColumns};gap:16px}
.fact-grid div{padding:14px;border-radius:${radiusSm};background:${overlay === 'solid' ? 'rgba(255,255,255,.06)' : '#eef6f4'};border:1px solid ${cardBorder}}
.fact-grid strong,.fact-grid span{display:block}
.contact-list,.downloads{display:grid;gap:10px;padding-left:20px;color:${ink}}
.place dl{display:grid;gap:8px;margin:0}
.place dt{font-size:.78rem;text-transform:uppercase;color:${muted};font-weight:900}
.place dd{margin:0;color:${ink}}
.gallery figure{margin:0}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:${radiusSm}}
.gallery figcaption{font:.85rem sans-serif;color:${muted};margin-top:6px}
footer{text-align:center;padding:28px;color:${overlay === 'solid' ? '#c3cdcb' : '#5f6d6d'}}
@media(max-width:700px){.hero-glass{align-items:flex-start;flex-direction:column}main{padding:12px}}`;
  }

  function generatedScript() {
    return `
    const modal = document.getElementById('pageModal');
    const modalBody = document.getElementById('modalBody');
    const closeModal = document.getElementById('closeModal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });

    document.querySelectorAll('.page-card').forEach(card => {
      card.addEventListener('click', () => {
        const pageId = card.dataset.pageId;
        const page = window.GUIDEBOOK_PAGES.find(p => p.id === pageId);
        if (page) {
          modalBody.innerHTML = \`
            <div class="modal-page-header">
              \${page.coverImage ? \`<img src="\${page.coverImage}" class="modal-cover">\` : ''}
              <div class="modal-title-area">
                \${page.icon ? \`<span class="modal-icon">\${page.icon}</span>\` : ''}
                <h1>\${page.title}</h1>
              </div>
            </div>
            <div class="modal-page-content">\${page.contentHtml}</div>
          \`;
          modal.showModal();
          document.body.style.overflow = 'hidden';
          // Observe new blocks
          modalBody.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
      });
    });

    const doClose = () => { modal.close(); document.body.style.overflow = ''; };
    closeModal.addEventListener('click', doClose);
    modal.addEventListener('click', (e) => { if (e.target === modal) doClose(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.open) doClose(); });

    document.querySelectorAll('a[download]').forEach(link=>link.addEventListener('click',()=>console.log('Offline resource opened:',link.getAttribute('href'))));
    `;
  }

  function buildGuidebookZip(project) {
    const folder = projectFolder(project);
    const files = [
      { path: `${folder}/index.html`, content: renderGuidebookHtml(project) },
      { path: `${folder}/css/style.css`, content: generatedCss(project) },
      { path: `${folder}/js/script.js`, content: generatedScript() }
    ];
    for (const asset of allAssets(project)) files.push({ path: `${folder}/${assetPath(asset)}`, bytes: dataUrlToBytes(asset.dataUrl) });
    return createZip(files);
  }

  function previewDocument(project) {
    return renderGuidebookHtml(project, 'preview')
      .replace('<link rel="stylesheet" href="css/style.css">', `<style>${generatedCss(project)}</style>`)
      .replace('<script src="js/script.js"></script>', `<script>${generatedScript()}</script>`);
  }

  window.GuidebookExporter = { renderGuidebookHtml, generatedCss, generatedScript, buildGuidebookZip, previewDocument, FONT_PAIRINGS };
}());
