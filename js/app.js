(function () {
  const { emptyProject, normalizeProject, createId } = window.GuidebookProject;
  const Store = window.ProjectStore;
  const Assets = window.GuidebookAssets;
  const Exporter = window.GuidebookExporter;

  let project = normalizeProject(emptyProject());

  const els = {
    form: document.getElementById('projectForm'),
    workspaceTitle: document.getElementById('workspaceTitle'),
    saveState: document.getElementById('saveState'),
    projectCount: document.getElementById('projectCount'),
    previewFrame: document.getElementById('previewFrame'),
    assetSummary: document.getElementById('assetSummary'),
    sectionsList: document.getElementById('sectionsList'),
    placesList: document.getElementById('placesList'),
    imageList: document.getElementById('imageList'),
    fileList: document.getElementById('fileList'),
    manager: document.getElementById('projectManager'),
    projectRows: document.getElementById('projectRows'),
    projectSearch: document.getElementById('projectSearch'),
    settingsDialog: document.getElementById('settingsDialog'),
    toast: document.getElementById('toast'),
    backupInput: document.getElementById('backupInput'),
    logoInput: document.getElementById('logoInput'),
    bannerInput: document.getElementById('bannerInput'),
    backgroundInput: document.getElementById('backgroundInput'),
    logoPreview: document.getElementById('logoPreview'),
    bannerPreview: document.getElementById('bannerPreview'),
    backgroundPreview: document.getElementById('backgroundPreview'),
    galleryInput: document.getElementById('galleryInput'),
    documentInput: document.getElementById('documentInput'),
    addSectionBtn: document.getElementById('addSectionBtn'),
    addPlaceBtn: document.getElementById('addPlaceBtn'),
    editorLayout: document.getElementById('editorLayout'),
    editorMenuToggle: document.getElementById('editorMenuToggle'),
    fontStyleSelect: document.getElementById('fontStyleSelect')
  };

  function field(name) { return els.form.elements[name]; }
  function showToast(message) { els.toast.textContent = message; els.toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 2600); }
  function formatDate(value) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not saved'; }
  function downloadText(name, text, type = 'application/json') { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 500); }

  // Top-level fields map 1:1 onto project.<name>.
  // Nested fields map onto project.<group>.<key> (property / host / theme).
  const TOP_LEVEL_FIELDS = ['projectName', 'title', 'subtitle', 'author', 'description'];
  const NESTED_FIELDS = {
    propertyName: ['property', 'name'],
    propertyType: ['property', 'type'],
    propertyAddress: ['property', 'address'],
    propertyDescription: ['property', 'description'],
    checkIn: ['property', 'checkIn'],
    checkOut: ['property', 'checkOut'],
    houseRules: ['property', 'houseRules'],
    hostName: ['host', 'name'],
    hostBio: ['host', 'bio'],
    hostPhone: ['host', 'phone'],
    hostEmail: ['host', 'email'],
    hostContactNote: ['host', 'contactNote'],
    accent: ['theme', 'accent'],
    layout: ['theme', 'layout'],
    fontStyle: ['theme', 'fontStyle'],
    cornerStyle: ['theme', 'cornerStyle'],
    overlayStyle: ['theme', 'overlayStyle']
  };

  function syncFields() {
    TOP_LEVEL_FIELDS.forEach(name => { if (field(name)) field(name).value = project[name] || ''; });
    Object.entries(NESTED_FIELDS).forEach(([name, pair]) => {
      const group = pair[0], key = pair[1];
      if (field(name)) field(name).value = (project[group] && project[group][key]) || '';
    });
  }

  function collectFromFields() {
    TOP_LEVEL_FIELDS.forEach(name => { if (field(name)) project[name] = field(name).value; });
    Object.entries(NESTED_FIELDS).forEach(([name, pair]) => {
      const group = pair[0], key = pair[1];
      if (field(name)) { project[group] = project[group] || {}; project[group][key] = field(name).value; }
    });
    project.updatedAt = new Date().toISOString();
  }

  function sectionCard(section, index) {
    return `<article class="section-card">
      <header><strong>Page ${index + 1}</strong><button type="button" class="button ghost" data-remove-section="${section.id}">Remove</button></header>
      <label>Page Title <input data-section-title="${section.id}" value="${escapeAttr(section.title)}" /></label>
      <label>Page Body <textarea data-section-body="${section.id}">${escapeHtml(section.body)}</textarea></label>
    </article>`;
  }

  function placeCard(place, index) {
    return `<article class="section-card">
      <header><strong>Place ${index + 1}</strong><button type="button" class="button ghost" data-remove-place="${place.id}">Remove</button></header>
      <div class="mini-meta">
        <label>Name <input data-place-name="${place.id}" value="${escapeAttr(place.name)}" /></label>
        <label>Category <input data-place-category="${place.id}" value="${escapeAttr(place.category)}" /></label>
        <label>Distance <input data-place-distance="${place.id}" value="${escapeAttr(place.distance)}" /></label>
      </div>
      <label>Address <input data-place-address="${place.id}" value="${escapeAttr(place.address)}" /></label>
      <label>Notes <textarea class="place-notes" data-place-notes="${place.id}">${escapeHtml(place.notes)}</textarea></label>
    </article>`;
  }

  function singleAssetTile(asset, label, removeAttr) {
    if (!asset) return `<p class="asset-empty single-empty">No ${label.toLowerCase()} uploaded yet.</p>`;
    return `<article class="asset-tile single-asset-tile"><img alt="${escapeAttr(asset.originalName || asset.name)}" src="${asset.dataUrl}" /><strong>${escapeHtml(asset.originalName || asset.name)}</strong><button type="button" ${removeAttr}="true">Remove ${escapeHtml(label)}</button></article>`;
  }

  function renderDynamicLists() {
    els.sectionsList.innerHTML = project.sections.map(sectionCard).join('') || '<p class="asset-empty">No guidebook pages yet. Add a welcome page, house instructions, or local tip.</p>';
    els.placesList.innerHTML = project.places.map(placeCard).join('') || '<p class="asset-empty">No nearby places yet. Add restaurants, groceries, transit, or attractions.</p>';
    if (els.logoPreview) els.logoPreview.innerHTML = singleAssetTile(project.logo, 'Logo', 'data-remove-logo');
    if (els.bannerPreview) els.bannerPreview.innerHTML = singleAssetTile(project.banner, 'Banner', 'data-remove-banner');
    if (els.backgroundPreview) els.backgroundPreview.innerHTML = singleAssetTile(project.backgroundImage, 'Background Image', 'data-remove-background');
    els.imageList.innerHTML = project.images.map(asset => `<article class="asset-tile"><img alt="${escapeAttr(asset.originalName || asset.name)}" src="${asset.dataUrl}" /><strong>${escapeHtml(asset.originalName || asset.name)}</strong><button type="button" data-remove-image="${asset.id}">Remove</button></article>`).join('') || '<p class="asset-empty">Gallery images will appear here after upload.</p>';
    els.fileList.innerHTML = project.documents.map(asset => `<article class="asset-row"><span>${escapeHtml(asset.originalName || asset.name)}</span><small>${escapeHtml(asset.type || 'file')}</small><button type="button" data-remove-document="${asset.id}">Remove</button></article>`).join('') || '<p class="asset-empty">Downloadable documents and media will appear here.</p>';
  }

  function renderPreview() {
    collectFromFields();
    els.workspaceTitle.textContent = project.title || project.projectName || 'Untitled guidebook';
    els.assetSummary.textContent = `${project.images.length + project.documents.length} assets`;
    els.previewFrame.srcdoc = Exporter.previewDocument(project);
  }

  function renderAll() { syncFields(); renderDynamicLists(); renderPreview(); refreshProjectCount(); }

  async function refreshProjectCount() {
    const projects = await Store.all();
    els.projectCount.textContent = `${projects.length} project${projects.length === 1 ? '' : 's'} saved`;
  }

  async function saveProject() {
    collectFromFields();
    if (!project.projectName.trim()) project.projectName = 'Untitled Guidebook';
    project = await Store.save(project);
    els.saveState.textContent = `Saved ${formatDate(project.updatedAt)}`;
    showToast('Project saved locally.');
    await refreshProjectCount();
  }

  async function openManager() {
    const projects = await Store.all();
    renderManager(projects);
    els.manager.showModal();
  }

  function renderManager(projects) {
    const q = (els.projectSearch.value || '').toLowerCase();
    const filtered = projects.filter(item => `${item.projectName} ${item.title}`.toLowerCase().includes(q));
    els.projectRows.innerHTML = filtered.map(item => `<article class="project-row">
      <div><strong>${escapeHtml(item.projectName || 'Untitled')}</strong><p>${escapeHtml(item.title || 'No website title')}</p></div>
      <div><small>Created</small><span>${formatDate(item.createdAt)}</span></div>
      <div><small>Modified</small><span>${formatDate(item.updatedAt)}</span></div>
      <div class="row-actions"><button type="button" class="button solid" data-load-project="${item.id}">Load</button><button type="button" class="button danger" data-delete-project="${item.id}">Delete</button></div>
    </article>`).join('') || '<p class="asset-empty">No saved projects match your search.</p>';
  }

  async function handleFileUpload(input, kind, target) {
    const files = await Assets.filesToAssets(input.files, kind);
    project[target].push(...files);
    input.value = '';
    renderDynamicLists();
    renderPreview();
    showToast(`${files.length} asset${files.length === 1 ? '' : 's'} added.`);
  }

  async function exportGuidebook(button) {
    collectFromFields();
    const exportButton = button || document.querySelector('[data-action="export-guidebook"]');
    const originalLabel = exportButton ? exportButton.textContent : '';
    try {
      if (exportButton) { exportButton.disabled = true; exportButton.textContent = 'Preparing ZIP…'; }
      const zipBlob = await Exporter.buildGuidebookZip(project);
      const folderName = Assets.safeName(project.projectName || project.title || 'guidebook');
      window.GuidebookZip.downloadBlob(zipBlob, `${folderName}.zip`);
      showToast('Guidebook ZIP downloaded.');
    } catch (error) {
      console.error('Guidebook export failed:', error);
      showToast('Download failed. Please check uploaded files and try again.');
    } finally {
      if (exportButton) { exportButton.disabled = false; exportButton.textContent = originalLabel || 'Download My Guidebook'; }
    }
  }

  async function exportBackup() {
    const backup = await Store.backup();
    downloadText('GuidebookBackup.json', JSON.stringify(backup, null, 2));
    showToast('Progress backup downloaded.');
  }

  async function importBackup(file) {
    const text = await file.text();
    const backup = JSON.parse(text);
    await Store.merge((backup.projects || []).map(normalizeProject));
    await refreshProjectCount();
    showToast('Backup imported and merged.');
  }

  function bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab.dataset.tab));
    }));

    els.editorMenuToggle.addEventListener('click', () => {
      const collapsed = els.editorLayout.classList.toggle('is-collapsed');
      els.editorMenuToggle.setAttribute('aria-expanded', String(!collapsed));
      els.editorMenuToggle.setAttribute('aria-label', collapsed ? 'Expand editor menu' : 'Collapse editor menu');
    });

    els.form.addEventListener('input', event => {
      const target = event.target;
      if (target.dataset.sectionTitle) project.sections.find(s => s.id === target.dataset.sectionTitle).title = target.value;
      else if (target.dataset.sectionBody) project.sections.find(s => s.id === target.dataset.sectionBody).body = target.value;
      else if (target.dataset.placeName) project.places.find(p => p.id === target.dataset.placeName).name = target.value;
      else if (target.dataset.placeCategory) project.places.find(p => p.id === target.dataset.placeCategory).category = target.value;
      else if (target.dataset.placeDistance) project.places.find(p => p.id === target.dataset.placeDistance).distance = target.value;
      else if (target.dataset.placeAddress) project.places.find(p => p.id === target.dataset.placeAddress).address = target.value;
      else if (target.dataset.placeNotes) project.places.find(p => p.id === target.dataset.placeNotes).notes = target.value;
      renderPreview();
    });

    els.form.addEventListener('change', event => {
      const target = event.target;
      if (target.name === 'overlayStyle' || target.tagName === 'SELECT' || target.type === 'color') renderPreview();
    });

    document.body.addEventListener('click', async event => {
      const actionTarget = event.target.closest('[data-action]');
      const action = actionTarget && actionTarget.dataset.action;
      if (action === 'new-project') { project = normalizeProject(emptyProject()); els.saveState.textContent = 'Not saved yet'; renderAll(); showToast('New project started.'); }
      if (action === 'open-manager') openManager();
      if (action === 'save-project') saveProject();
      if (action === 'export-guidebook') await exportGuidebook(actionTarget);
      if (action === 'export-backup') exportBackup();
      if (action === 'open-settings') els.settingsDialog.showModal();
      if (event.target.id === 'addSectionBtn') { project.sections.push({ id: createId('section'), title: 'New Guidebook Page', body: '' }); renderDynamicLists(); renderPreview(); }
      if (event.target.id === 'addPlaceBtn') { project.places.push({ id: createId('place'), name: 'New Place', category: 'Local recommendation', distance: '', address: '', notes: '' }); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeSection) { project.sections = project.sections.filter(item => item.id !== event.target.dataset.removeSection); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removePlace) { project.places = project.places.filter(item => item.id !== event.target.dataset.removePlace); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeImage) { project.images = project.images.filter(item => item.id !== event.target.dataset.removeImage); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeDocument) { project.documents = project.documents.filter(item => item.id !== event.target.dataset.removeDocument); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeLogo) { project.logo = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeBanner) { project.banner = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeBackground) { project.backgroundImage = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.loadProject) { project = normalizeProject(await Store.get(event.target.dataset.loadProject)); els.manager.close(); renderAll(); showToast('Project loaded.'); }
      if (event.target.dataset.deleteProject && confirm('Delete this local project? This cannot be undone.')) { await Store.delete(event.target.dataset.deleteProject); openManager(); refreshProjectCount(); }
    });

    els.projectSearch.addEventListener('input', openManager);
    els.logoInput.addEventListener('change', async () => { const [asset] = await Assets.filesToAssets(els.logoInput.files, 'image'); if (asset) project.logo = asset; els.logoInput.value = ''; renderDynamicLists(); renderPreview(); });
    els.bannerInput.addEventListener('change', async () => { const [asset] = await Assets.filesToAssets(els.bannerInput.files, 'image'); if (asset) project.banner = asset; els.bannerInput.value = ''; renderDynamicLists(); renderPreview(); });
    els.backgroundInput.addEventListener('change', async () => { const [asset] = await Assets.filesToAssets(els.backgroundInput.files, 'image'); if (asset) project.backgroundImage = asset; els.backgroundInput.value = ''; renderDynamicLists(); renderPreview(); });
    els.galleryInput.addEventListener('change', () => handleFileUpload(els.galleryInput, 'image', 'images'));
    els.documentInput.addEventListener('change', () => handleFileUpload(els.documentInput, 'document', 'documents'));
    els.backupInput.addEventListener('change', () => els.backupInput.files[0] && importBackup(els.backupInput.files[0]));
  }

  function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c])); }
  function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#096;'); }

  function populateFontOptions() {
    if (!els.fontStyleSelect || !Exporter.FONT_PAIRINGS) return;
    els.fontStyleSelect.innerHTML = Object.entries(Exporter.FONT_PAIRINGS)
      .map(([value, info]) => `<option value="${escapeAttr(value)}">${escapeHtml(info.label)}</option>`)
      .join('');
  }

  populateFontOptions();
  bindEvents();
  renderAll();
}());
