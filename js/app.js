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
    pagesListView: document.getElementById('pagesListView'),
    pageEditorView: document.getElementById('pageEditorView'),
    pagesList: document.getElementById('pagesList'),
    pageSearch: document.getElementById('pageSearch'),
    blocksList: document.getElementById('blocksList'),
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
    addPageBtn: document.getElementById('addPageBtn'),
    addPlaceBtn: document.getElementById('addPlaceBtn'),
    backToPagesBtn: document.getElementById('backToPagesBtn'),
    addBlockMenuBtn: document.getElementById('addBlockMenuBtn'),
    addBlockMenu: document.getElementById('addBlockMenu'),
    editorLayout: document.getElementById('editorLayout'),
    editorMenuToggle: document.getElementById('editorMenuToggle'),
    fontStyleSelect: document.getElementById('fontStyleSelect'),
    editPageTitle: document.getElementById('editPageTitle'),
    editPageSlug: document.getElementById('editPageSlug'),
    editPageIcon: document.getElementById('editPageIcon'),
    editPageStatus: document.getElementById('editPageStatus'),
    editPageDescription: document.getElementById('editPageDescription'),
    editPageCoverImage: document.getElementById('editPageCoverImage'),
    pageStatusBadge: document.getElementById('pageStatusBadge'),
    iconPicker: document.getElementById('iconPicker'),
    iconPickerGrid: document.querySelector('.icon-picker-grid'),
    editPageIconBtn: document.getElementById('editPageIconBtn')
  };

  const ICONS = ['📄', '👋', '🏠', '✨', '📍', '🍴', '🚌', '🛒', '🔑', '🅿️', '🚭', '🐕', '📶', '🛁', '☕', '🍷', '🌳', '🌊', '🚵', '🏊', '📚', '🍳', '💡', '⏰', '🗺️', '🛎️', '💬', '📞', '❤️', '✅'];

  let editingPageId = null;
  let activeIconPickerTarget = null;

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
    if (editingPageId) {
      const page = project.pages.find(p => p.id === editingPageId);
      if (page) {
        page.title = els.editPageTitle.value;
        page.slug = els.editPageSlug.value;
        page.icon = els.editPageIcon.value;
        page.status = els.editPageStatus.value;
        page.description = els.editPageDescription.value;
        page.coverImage = els.editPageCoverImage.value;
        page.updatedAt = new Date().toISOString();
      }
    }
    project.updatedAt = new Date().toISOString();
  }

  function pageCard(page) {
    return `<article class="section-card page-item-card" data-edit-page="${page.id}">
      <header>
        <div class="page-item-info">
          <span class="page-item-icon">${escapeHtml(page.icon || '📄')}</span>
          <strong>${escapeHtml(page.title || 'Untitled Page')}</strong>
          <span class="status-pill ${page.status}">${page.status}</span>
        </div>
        <div class="page-item-actions">
          <button type="button" class="button ghost mini" data-move-page-up="${page.id}" title="Move Up">↑</button>
          <button type="button" class="button ghost mini" data-move-page-down="${page.id}" title="Move Down">↓</button>
          <button type="button" class="button ghost mini" data-duplicate-page="${page.id}">Duplicate</button>
          <button type="button" class="button ghost mini" data-remove-page="${page.id}">Remove</button>
        </div>
      </header>
      <p class="page-item-desc">${escapeHtml(page.description || 'No description.')}</p>
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
    const pageQuery = (els.pageSearch.value || '').toLowerCase();
    const filteredPages = project.pages.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(pageQuery));
    els.pagesList.innerHTML = filteredPages.map(pageCard).join('') || '<p class="asset-empty">No pages found. Create your first page to get started!</p>';

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

  async function saveProject(isAuto = false) {
    collectFromFields();
    if (!project.projectName.trim()) project.projectName = 'Untitled Guidebook';
    project = await Store.save(project);
    els.saveState.textContent = `${isAuto ? 'Auto-saved' : 'Saved'} ${formatDate(project.updatedAt)}`;
    if (!isAuto) showToast('Project saved locally.');
    await refreshProjectCount();
  }

  const debouncedSave = (function() {
    let timer;
    return () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveProject(true), 2000);
    };
  })();

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
      if (target.dataset.blockRichText && editingPageId) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === target.dataset.id);
        block.content[target.dataset.blockRichText] = target.innerHTML;
        renderPreview();
        debouncedSave();
      }
      if (target.dataset.blockField && editingPageId) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === target.dataset.id);
        block.content[target.dataset.blockField] = target.value;
        renderPreview();
        debouncedSave();
      }
      if (target.dataset.featureItemIcon || target.dataset.featureItemTitle || target.dataset.featureItemDesc) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === target.closest('.feature-items').dataset.id);
        const index = target.dataset.featureItemIcon || target.dataset.featureItemTitle || target.dataset.featureItemDesc;
        const field = target.dataset.featureItemIcon !== undefined ? 'icon' : (target.dataset.featureItemTitle !== undefined ? 'title' : 'description');
        block.content.items[index][field] = target.value;
        renderPreview();
      }
      if (target.dataset.galleryItemUrl) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === target.closest('.gallery-builder').dataset.id);
        block.content.images[target.dataset.galleryItemUrl] = target.value;
        renderPreview();
      }
      if (target.dataset.placeName) project.places.find(p => p.id === target.dataset.placeName).name = target.value;
      else if (target.dataset.placeCategory) project.places.find(p => p.id === target.dataset.placeCategory).category = target.value;
      else if (target.dataset.placeDistance) project.places.find(p => p.id === target.dataset.placeDistance).distance = target.value;
      else if (target.dataset.placeAddress) project.places.find(p => p.id === target.dataset.placeAddress).address = target.value;
      else if (target.dataset.placeNotes) project.places.find(p => p.id === target.dataset.placeNotes).notes = target.value;
      renderPreview();
      debouncedSave();
    });

    els.form.addEventListener('change', event => {
      const target = event.target;
      if (target.dataset.blockField && target.tagName === 'SELECT' && editingPageId) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === target.dataset.id);
        block.content[target.dataset.blockField] = target.value;
        renderPreview();
        debouncedSave();
      }
      if (target.name === 'overlayStyle' || target.tagName === 'SELECT' || target.type === 'color' || target.id === 'editPageStatus') {
        renderPreview();
        debouncedSave();
      }
    });

    document.body.addEventListener('click', async event => {
      const actionTarget = event.target.closest('[data-action]');
      const action = actionTarget && actionTarget.dataset.action;
      if (action === 'new-project') { project = normalizeProject(emptyProject()); els.saveState.textContent = 'Not saved yet'; editingPageId = null; showPagesList(); renderAll(); showToast('New project started.'); }
      if (action === 'open-manager') openManager();
      if (action === 'save-project') saveProject();
      if (action === 'export-guidebook') await exportGuidebook(actionTarget);
      if (action === 'export-backup') exportBackup();
      if (action === 'open-settings') els.settingsDialog.showModal();

      if (event.target.id === 'addPageBtn') {
        const newPage = { id: createId('page'), title: 'New Page', slug: 'new-page-' + Date.now(), icon: '📄', status: 'draft', blocks: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        project.pages.push(newPage);
        openPageEditor(newPage.id);
      }
      if (event.target.id === 'backToPagesBtn') showPagesList();
      if (event.target.closest('[data-edit-page]')) {
        const id = event.target.closest('[data-edit-page]').dataset.editPage;
        if (!event.target.closest('button')) openPageEditor(id);
      }
      if (event.target.dataset.movePageUp) {
        const id = event.target.dataset.movePageUp;
        const idx = project.pages.findIndex(p => p.id === id);
        if (idx > 0) { [project.pages[idx], project.pages[idx - 1]] = [project.pages[idx - 1], project.pages[idx]]; renderDynamicLists(); renderPreview(); debouncedSave(); }
      }
      if (event.target.dataset.movePageDown) {
        const id = event.target.dataset.movePageDown;
        const idx = project.pages.findIndex(p => p.id === id);
        if (idx < project.pages.length - 1) { [project.pages[idx], project.pages[idx + 1]] = [project.pages[idx + 1], project.pages[idx]]; renderDynamicLists(); renderPreview(); debouncedSave(); }
      }

      if (event.target.dataset.duplicatePage) {
        const original = project.pages.find(p => p.id === event.target.dataset.duplicatePage);
        const copy = structuredClone(original);
        copy.id = createId('page');
        copy.title += ' (Copy)';
        copy.slug += '-copy-' + Math.random().toString(36).slice(2, 5);
        project.pages.push(copy);
        renderDynamicLists(); renderPreview(); showToast('Page duplicated.');
        debouncedSave();
      }
      if (event.target.dataset.removePage || event.target.id === 'deletePageBtn') {
        const id = event.target.dataset.removePage || editingPageId;
        if (confirm('Delete this page?')) {
          project.pages = project.pages.filter(p => p.id !== id);
          if (editingPageId === id) showPagesList();
          renderDynamicLists(); renderPreview();
        }
      }

      if (event.target.id === 'addBlockMenuBtn') els.addBlockMenu.classList.toggle('hidden');
      else if (!event.target.closest('#addBlockMenu')) els.addBlockMenu.classList.add('hidden');

      if (event.target.dataset.addBlock) {
        const type = event.target.dataset.addBlock;
        const page = project.pages.find(p => p.id === editingPageId);
        const newBlock = { id: createId('block'), type, order: page.blocks.length, content: getDefaultBlockContent(type) };
        page.blocks.push(newBlock);
        renderBlocks(); renderPreview();
      }

      if (event.target.dataset.moveBlockUp) {
        const id = event.target.dataset.moveBlockUp;
        const page = project.pages.find(p => p.id === editingPageId);
        const idx = page.blocks.findIndex(b => b.id === id);
        if (idx > 0) { [page.blocks[idx], page.blocks[idx - 1]] = [page.blocks[idx - 1], page.blocks[idx]]; renderBlocks(); renderPreview(); }
      }
      if (event.target.dataset.moveBlockDown) {
        const id = event.target.dataset.moveBlockDown;
        const page = project.pages.find(p => p.id === editingPageId);
        const idx = page.blocks.findIndex(b => b.id === id);
        if (idx < page.blocks.length - 1) { [page.blocks[idx], page.blocks[idx + 1]] = [page.blocks[idx + 1], page.blocks[idx]]; renderBlocks(); renderPreview(); }
      }
      if (event.target.dataset.duplicateBlock) {
        const id = event.target.dataset.duplicateBlock;
        const page = project.pages.find(p => p.id === editingPageId);
        const original = page.blocks.find(b => b.id === id);
        const copy = structuredClone(original);
        copy.id = createId('block');
        page.blocks.splice(page.blocks.indexOf(original) + 1, 0, copy);
        renderBlocks(); renderPreview();
      }
      if (event.target.dataset.toggleBlock) {
        const id = event.target.dataset.toggleBlock;
        const body = document.getElementById(`block-body-${id}`);
        const btn = event.target;
        const isHidden = body.classList.toggle('hidden');
        btn.textContent = isHidden ? '▸' : '▾';
      }
      if (event.target.dataset.removeBlock) {
        const id = event.target.dataset.removeBlock;
        const page = project.pages.find(p => p.id === editingPageId);
        page.blocks = page.blocks.filter(b => b.id !== id);
        renderBlocks(); renderPreview();
        debouncedSave();
      }

      if (event.target.dataset.addFeatureItem) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.addFeatureItem);
        block.content.items.push({ icon: '✨', title: 'New Item', description: '' });
        renderBlocks(); renderPreview();
      }
      if (event.target.dataset.removeFeatureItem) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.id);
        block.content.items.splice(event.target.dataset.removeFeatureItem, 1);
        renderBlocks(); renderPreview();
      }
      if (event.target.dataset.addGalleryItem) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.addGalleryItem);
        block.content.images.push('');
        renderBlocks(); renderPreview();
      }
      if (event.target.dataset.moveGalleryItemUp !== undefined) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.id);
        const i = parseInt(event.target.dataset.moveGalleryItemUp);
        if (i > 0) {
          [block.content.images[i], block.content.images[i - 1]] = [block.content.images[i - 1], block.content.images[i]];
          renderBlocks(); renderPreview(); debouncedSave();
        }
      }
      if (event.target.dataset.moveGalleryItemDown !== undefined) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.id);
        const i = parseInt(event.target.dataset.moveGalleryItemDown);
        if (i < block.content.images.length - 1) {
          [block.content.images[i], block.content.images[i + 1]] = [block.content.images[i + 1], block.content.images[i]];
          renderBlocks(); renderPreview(); debouncedSave();
        }
      }
      if (event.target.dataset.removeGalleryItem) {
        const page = project.pages.find(p => p.id === editingPageId);
        const block = page.blocks.find(b => b.id === event.target.dataset.id);
        block.content.images.splice(event.target.dataset.removeGalleryItem, 1);
        renderBlocks(); renderPreview();
      }

      if (event.target.id === 'addPlaceBtn') { project.places.push({ id: createId('place'), name: 'New Place', category: 'Local recommendation', distance: '', address: '', notes: '' }); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removePlace) { project.places = project.places.filter(item => item.id !== event.target.dataset.removePlace); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeImage) { project.images = project.images.filter(item => item.id !== event.target.dataset.removeImage); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeDocument) { project.documents = project.documents.filter(item => item.id !== event.target.dataset.removeDocument); renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeLogo) { project.logo = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeBanner) { project.banner = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.removeBackground) { project.backgroundImage = null; renderDynamicLists(); renderPreview(); }
      if (event.target.dataset.loadProject) { project = normalizeProject(await Store.get(event.target.dataset.loadProject)); els.manager.close(); editingPageId = null; showPagesList(); renderAll(); showToast('Project loaded.'); }
      if (event.target.dataset.deleteProject && confirm('Delete this local project? This cannot be undone.')) { await Store.delete(event.target.dataset.deleteProject); openManager(); refreshProjectCount(); }
    });

    function showPagesList() {
      editingPageId = null;
      els.pagesListView.classList.remove('hidden');
      els.pageEditorView.classList.add('hidden');
      renderDynamicLists();
    }

    function openPageEditor(id) {
      editingPageId = id;
      const page = project.pages.find(p => p.id === id);
      els.editPageTitle.value = page.title;
      els.editPageSlug.value = page.slug;
    els.editPageIcon.value = page.icon || '📄';
    els.editPageIconBtn.textContent = page.icon || '📄';
      els.editPageStatus.value = page.status;
      els.editPageDescription.value = page.description;
      els.editPageCoverImage.value = page.coverImage || '';

      els.pagesListView.classList.add('hidden');
      els.pageEditorView.classList.remove('hidden');
      updatePageStatusBadge();
      renderBlocks();
    }

    function updatePageStatusBadge() {
      const status = els.editPageStatus.value;
      els.pageStatusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      els.pageStatusBadge.className = 'status-badge ' + status;
    }

    function renderBlocks() {
      if (!editingPageId) return;
      const page = project.pages.find(p => p.id === editingPageId);
      if (!page) return;
      els.blocksList.innerHTML = page.blocks.map(renderBlockEditor).join('');
    }

    function renderBlockEditor(block, index) {
      let contentHtml = '';
      const c = block.content || {};

      switch (block.type) {
        case 'heading':
          contentHtml = `
            <div class="block-field-group">
              <label>Level <select data-block-field="level" data-id="${block.id}">
                <option value="h1" ${c.level === 'h1' ? 'selected' : ''}>H1</option>
                <option value="h2" ${c.level === 'h2' ? 'selected' : ''}>H2</option>
                <option value="h3" ${c.level === 'h3' ? 'selected' : ''}>H3</option>
              </select></label>
              <label>Alignment <select data-block-field="align" data-id="${block.id}">
                <option value="left" ${c.align === 'left' ? 'selected' : ''}>Left</option>
                <option value="center" ${c.align === 'center' ? 'selected' : ''}>Center</option>
                <option value="right" ${c.align === 'right' ? 'selected' : ''}>Right</option>
              </select></label>
            </div>
            <input type="text" data-block-field="text" data-id="${block.id}" value="${escapeAttr(c.text)}" placeholder="Heading text..." />
          `;
          break;
        case 'paragraph':
          contentHtml = `
            <div class="rich-text-toolbar">
              <button type="button" class="tool-btn" data-cmd="bold" title="Bold"><b>B</b></button>
              <button type="button" class="tool-btn" data-cmd="italic" title="Italic"><i>I</i></button>
              <button type="button" class="tool-btn" data-cmd="underline" title="Underline"><u>U</u></button>
              <button type="button" class="tool-btn" data-cmd="insertUnorderedList" title="Bullet List">•</button>
              <button type="button" class="tool-btn" data-cmd="createLink" title="Link">🔗</button>
              <button type="button" class="tool-btn" data-cmd="unlink" title="Remove Link">⎌</button>
            </div>
            <div class="rich-text-editor" contenteditable="true" data-block-rich-text="text" data-id="${block.id}">${c.text || ''}</div>
          `;
          break;
        case 'image':
          contentHtml = `
            <div class="block-image-upload">
              <div class="image-field-row">
                <input type="text" data-block-field="url" data-id="${block.id}" value="${escapeAttr(c.url)}" placeholder="Image URL" />
                <span>or</span>
                <label class="button ghost mini file-nav">Upload<input type="file" accept="image/*" data-block-file-upload="${block.id}" class="visually-hidden" /></label>
              </div>
              ${c.url ? `<div class="block-image-preview"><img src="${c.url}" alt="Preview" /></div>` : ''}
            </div>
            <div class="two-column">
              <input type="text" data-block-field="alt" data-id="${block.id}" value="${escapeAttr(c.alt)}" placeholder="Alt text" />
              <input type="text" data-block-field="caption" data-id="${block.id}" value="${escapeAttr(c.caption)}" placeholder="Caption" />
            </div>
          `;
          break;
        case 'featureList':
          const items = c.items || [];
          contentHtml = `
            <div class="feature-items" data-id="${block.id}">
              ${items.map((item, i) => `
                <div class="feature-item-row">
                  <button type="button" class="icon-picker-trigger mini" data-id="${block.id}" data-index="${i}">${escapeHtml(item.icon || '✨')}</button>
                  <input type="text" placeholder="Title" data-feature-item-title="${i}" value="${escapeAttr(item.title)}" />
                  <input type="text" placeholder="Description" data-feature-item-desc="${i}" value="${escapeAttr(item.description)}" />
                  <button type="button" class="button ghost mini" data-remove-feature-item="${i}" data-id="${block.id}">×</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="button ghost mini" data-add-feature-item="${block.id}">+ Add Item</button>
          `;
          break;
        case 'gallery':
          const images = c.images || [];
          contentHtml = `
            <div class="gallery-builder" data-id="${block.id}">
              ${images.map((img, i) => `
                <div class="gallery-item-row">
                  <div class="gallery-item-preview">${img ? `<img src="${img}">` : ''}</div>
                  <input type="text" placeholder="Image URL" data-gallery-item-url="${i}" value="${escapeAttr(img)}" />
                  <label class="button ghost mini file-nav">Upload<input type="file" accept="image/*" data-gallery-file-upload="${i}" data-id="${block.id}" class="visually-hidden" /></label>
                  <div class="gallery-item-actions">
                    <button type="button" class="button ghost mini" data-move-gallery-item-up="${i}" data-id="${block.id}" title="Move Up">↑</button>
                    <button type="button" class="button ghost mini" data-move-gallery-item-down="${i}" data-id="${block.id}" title="Move Down">↓</button>
                    <button type="button" class="button ghost mini" data-remove-gallery-item="${i}" data-id="${block.id}">×</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <button type="button" class="button ghost mini" data-add-gallery-item="${block.id}">+ Add Image</button>
          `;
          break;
        case 'twoColumn':
          contentHtml = `
            <div class="two-column">
              <textarea data-block-field="left" data-id="${block.id}" placeholder="Left column content">${escapeHtml(c.left)}</textarea>
              <textarea data-block-field="right" data-id="${block.id}" placeholder="Right column content">${escapeHtml(c.right)}</textarea>
            </div>
          `;
          break;
        case 'cta':
          contentHtml = `
            <input type="text" data-block-field="title" data-id="${block.id}" value="${escapeAttr(c.title)}" placeholder="CTA Title" />
            <textarea data-block-field="description" data-id="${block.id}" placeholder="CTA Description">${escapeHtml(c.description)}</textarea>
            <div class="block-image-upload">
              <div class="image-field-row">
                <input type="text" data-block-field="bgImage" data-id="${block.id}" value="${escapeAttr(c.bgImage)}" placeholder="Background Image URL" />
                <span>or</span>
                <label class="button ghost mini file-nav">Upload<input type="file" accept="image/*" data-cta-file-upload="${block.id}" class="visually-hidden" /></label>
              </div>
              ${c.bgImage ? `<div class="block-image-preview"><img src="${c.bgImage}" alt="Preview" /></div>` : ''}
            </div>
            <div class="two-column">
              <input type="text" data-block-field="buttonText" data-id="${block.id}" value="${escapeAttr(c.buttonText)}" placeholder="Button Text" />
              <input type="text" data-block-field="buttonLink" data-id="${block.id}" value="${escapeAttr(c.buttonLink)}" placeholder="Button Link" />
            </div>
          `;
          break;
        case 'custom':
          contentHtml = `
            <input type="text" data-block-field="title" data-id="${block.id}" value="${escapeAttr(c.title)}" placeholder="Section Title" />
            <textarea data-block-field="html" data-id="${block.id}" placeholder="Custom HTML/Content">${escapeHtml(c.html)}</textarea>
          `;
          break;
      }

      return `<div class="block-editor-item" data-block-id="${block.id}" draggable="true">
        <div class="block-header">
          <div class="block-header-left">
            <button type="button" class="ctrl-btn" data-toggle-block="${block.id}">▾</button>
            <span class="block-type-badge">${block.type}</span>
          </div>
          <div class="block-controls">
            <button type="button" class="ctrl-btn" data-move-block-up="${block.id}" title="Move Up">↑</button>
            <button type="button" class="ctrl-btn" data-move-block-down="${block.id}" title="Move Down">↓</button>
            <button type="button" class="ctrl-btn" data-duplicate-block="${block.id}" title="Duplicate">⧉</button>
            <button type="button" class="ctrl-btn danger" data-remove-block="${block.id}" title="Delete">×</button>
          </div>
        </div>
        <div class="block-content-area" id="block-body-${block.id}">
          ${contentHtml}
        </div>
      </div>`;
    }

    els.editPageStatus.addEventListener('change', updatePageStatusBadge);
    els.pageSearch.addEventListener('input', renderDynamicLists);

    document.getElementById('duplicatePageBtn').addEventListener('click', () => {
      if (!editingPageId) return;
      const original = project.pages.find(p => p.id === editingPageId);
      const copy = structuredClone(original);
      copy.id = createId('page');
      copy.title += ' (Copy)';
      copy.slug += '-copy-' + Math.random().toString(36).slice(2, 5);
      project.pages.push(copy);
      renderDynamicLists(); renderPreview(); showToast('Page duplicated.');
      debouncedSave();
      openPageEditor(copy.id);
    });

    els.form.addEventListener('change', async (event) => {
      const target = event.target;
      if (target.id === 'editPageCoverUpload' && editingPageId) {
        const [asset] = await Assets.filesToAssets(target.files, 'image');
        if (asset) {
          els.editPageCoverImage.value = asset.dataUrl;
          const page = project.pages.find(p => p.id === editingPageId);
          page.coverImage = asset.dataUrl;
          renderPreview(); debouncedSave();
        }
      }
      if (target.dataset.blockFileUpload && editingPageId) {
        const [asset] = await Assets.filesToAssets(target.files, 'image');
        if (asset) {
          const page = project.pages.find(p => p.id === editingPageId);
          const block = page.blocks.find(b => b.id === target.dataset.blockFileUpload);
          block.content.url = asset.dataUrl;
          renderBlocks(); renderPreview(); debouncedSave();
        }
      }
      if (target.dataset.ctaFileUpload && editingPageId) {
        const [asset] = await Assets.filesToAssets(target.files, 'image');
        if (asset) {
          const page = project.pages.find(p => p.id === editingPageId);
          const block = page.blocks.find(b => b.id === target.dataset.ctaFileUpload);
          block.content.bgImage = asset.dataUrl;
          renderBlocks(); renderPreview(); debouncedSave();
        }
      }
      if (target.dataset.galleryFileUpload && editingPageId) {
        const [asset] = await Assets.filesToAssets(target.files, 'image');
        if (asset) {
          const page = project.pages.find(p => p.id === editingPageId);
          const block = page.blocks.find(b => b.id === target.dataset.id);
          block.content.images[target.dataset.galleryFileUpload] = asset.dataUrl;
          renderBlocks(); renderPreview(); debouncedSave();
        }
      }
    });

    // Drag and Drop
    let draggedBlockId = null;
    els.blocksList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.block-editor-item');
      if (item) {
        draggedBlockId = item.dataset.blockId;
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });
    els.blocksList.addEventListener('dragend', (e) => {
      const item = e.target.closest('.block-editor-item');
      if (item) item.classList.remove('is-dragging');
      draggedBlockId = null;
    });
    els.blocksList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const item = e.target.closest('.block-editor-item');
      if (item && item.dataset.blockId !== draggedBlockId) {
        item.classList.add('drag-over');
      }
    });
    els.blocksList.addEventListener('dragleave', (e) => {
      const item = e.target.closest('.block-editor-item');
      if (item) item.classList.remove('drag-over');
    });
    els.blocksList.addEventListener('drop', (e) => {
      e.preventDefault();
      const item = e.target.closest('.block-editor-item');
      if (item) item.classList.remove('drag-over');
      if (item && draggedBlockId && item.dataset.blockId !== draggedBlockId) {
        const page = project.pages.find(p => p.id === editingPageId);
        const fromIdx = page.blocks.findIndex(b => b.id === draggedBlockId);
        const toIdx = page.blocks.findIndex(b => b.id === item.dataset.blockId);
        const [moved] = page.blocks.splice(fromIdx, 1);
        page.blocks.splice(toIdx, 0, moved);
        renderBlocks(); renderPreview(); debouncedSave();
      }
    });

    function getDefaultBlockContent(type) {
      switch (type) {
        case 'heading': return { text: 'New Heading', level: 'h2', align: 'left' };
        case 'paragraph': return { text: '' };
        case 'image': return { url: '', alt: '', caption: '' };
        case 'featureList': return { items: [{ icon: '✨', title: 'Feature Item', description: 'Brief description' }] };
        case 'gallery': return { images: [] };
        case 'twoColumn': return { left: '', right: '' };
        case 'cta': return { title: 'Ready to Book?', description: 'Contact us now.', buttonText: 'Email Us', buttonLink: '' };
        case 'custom': return { title: 'Custom Section', html: '' };
        default: return {};
      }
    }

    function setupIconPicker() {
      els.iconPickerGrid.innerHTML = ICONS.map(icon => `<button type="button" class="icon-option" data-icon="${icon}">${icon}</button>`).join('');

      document.body.addEventListener('click', (e) => {
        const trigger = e.target.closest('.icon-picker-trigger');
        if (trigger) {
          activeIconPickerTarget = trigger;
          const rect = trigger.getBoundingClientRect();
          els.iconPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
          els.iconPicker.style.left = `${rect.left + window.scrollX}px`;
          els.iconPicker.classList.remove('hidden');
          return;
        }
        if (!e.target.closest('.icon-picker')) {
          els.iconPicker.classList.add('hidden');
        }
      });

      els.iconPickerGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.icon-option');
        if (btn && activeIconPickerTarget) {
          const icon = btn.dataset.icon;
          activeIconPickerTarget.textContent = icon;

          if (activeIconPickerTarget.id === 'editPageIconBtn') {
            els.editPageIcon.value = icon;
            const page = project.pages.find(p => p.id === editingPageId);
            page.icon = icon;
          } else {
            const blockId = activeIconPickerTarget.dataset.id;
            const index = activeIconPickerTarget.dataset.index;
            const page = project.pages.find(p => p.id === editingPageId);
            const block = page.blocks.find(b => b.id === blockId);
            block.content.items[index].icon = icon;
          }

          renderPreview();
          debouncedSave();
          els.iconPicker.classList.add('hidden');
        }
      });
    }

    function setupRichText() {
      els.blocksList.addEventListener('click', (e) => {
        const toolBtn = e.target.closest('.tool-btn');
        if (toolBtn) {
          const cmd = toolBtn.dataset.cmd;
          const val = cmd === 'createLink' ? prompt('Enter URL:') : null;
          if (cmd === 'createLink' && !val) return;
          document.execCommand(cmd, false, val);

          // Trigger input event to save
          const editor = toolBtn.closest('.block-editor-item').querySelector('.rich-text-editor');
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    setupRichText();
    setupIconPicker();

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
