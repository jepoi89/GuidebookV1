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
    const pages = (project.sections || []).map(section => `<article class="card"><h2>${escapeHtml(section.title)}</h2><p>${lines(section.body)}</p></article>`).join('');
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

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(project.title)}</title><link rel="stylesheet" href="css/style.css"></head><body style="${bodyStyleParts.join(';')}" data-layout="${escapeHtml(theme.layout || 'editorial')}" data-font="${escapeHtml(theme.fontStyle || 'mixed')}" data-corners="${escapeHtml(theme.cornerStyle || 'soft')}" data-overlay="${escapeHtml(theme.overlayStyle || 'transparent')}" data-has-bg="${backgroundSrc ? 'true' : 'false'}"><header class="${heroClass}"${heroStyle}><div class="hero-glass">${logoSrc ? `<img class="logo" src="${logoSrc}" alt="${escapeHtml(project.title)} logo">` : ''}<div><p class="kicker">${escapeHtml(project.author || h.name || 'Offline guidebook')}</p><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.subtitle || '')}</p></div></div></header><main><section class="intro card"><h2>About this guide</h2><p>${lines(project.description)}</p></section><section class="property card"><p class="kicker">About the Property</p><h2>${escapeHtml(p.name || project.title)}</h2><p>${lines(p.description)}</p><div class="fact-grid"><div><strong>Type</strong><span>${escapeHtml(p.type || 'Property')}</span></div><div><strong>Check-in</strong><span>${escapeHtml(p.checkIn || '')}</span></div><div><strong>Check-out</strong><span>${escapeHtml(p.checkOut || '')}</span></div></div>${p.address ? `<p><strong>Address:</strong> ${lines(p.address)}</p>` : ''}${p.houseRules ? `<h3>House Rules</h3><p>${lines(p.houseRules)}</p>` : ''}</section><section class="host card"><p class="kicker">About Host</p><h2>${escapeHtml(h.name || 'Your Host')}</h2><p>${lines(h.bio || 'Host details will appear here.')}</p><ul class="contact-list">${h.phone ? `<li><strong>Phone</strong> ${escapeHtml(h.phone)}</li>` : ''}${h.email ? `<li><strong>Email</strong> ${escapeHtml(h.email)}</li>` : ''}${h.contactNote ? `<li><strong>Note</strong> ${lines(h.contactNote)}</li>` : ''}</ul></section>${pages ? `<section><p class="kicker">Guidebook Pages</p><div class="page-grid">${pages}</div></section>` : ''}${places ? `<section><p class="kicker">Nearby Places</p><div class="place-grid">${places}</div></section>` : ''}${gallery ? `<section><p class="kicker">Gallery</p><div class="gallery">${gallery}</div></section>` : ''}${docs ? `<section class="card"><p class="kicker">Downloads</p><h2>Files and Documents</h2><ul class="downloads">${docs}</ul></section>` : ''}</main><footer>Generated offline with Guidebook Studio.</footer><script src="js/script.js"></script></body></html>`;
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
    return `document.querySelectorAll('a[download]').forEach(link=>link.addEventListener('click',()=>console.log('Offline resource opened:',link.getAttribute('href'))));`;
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
    return renderGuidebookHtml(project, 'preview').replace('<link rel="stylesheet" href="css/style.css">', `<style>${generatedCss(project)}</style>`).replace('<script src="js/script.js"></script>', '');
  }

  window.GuidebookExporter = { renderGuidebookHtml, generatedCss, generatedScript, buildGuidebookZip, previewDocument, FONT_PAIRINGS };
}());
