(function () {
  const { createId } = window.GuidebookProject;
  function safeName(name = 'file') { return name.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'file'; }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
  async function filesToAssets(files, kind = 'document') { const list = []; for (const file of Array.from(files || [])) list.push({ id: createId(kind), name: safeName(file.name), originalName: file.name, type: file.type || 'application/octet-stream', size: file.size, kind, dataUrl: await fileToDataUrl(file), addedAt: new Date().toISOString() }); return list; }
  function dataUrlToBytes(dataUrl) { const parts = String(dataUrl || '').split(','); if (parts.length < 2) return new Uint8Array(); if (parts[0].includes(';base64')) { const binary = atob(parts[1]); return Uint8Array.from(binary, char => char.charCodeAt(0)); } return new TextEncoder().encode(decodeURIComponent(parts[1])); }
  function assetFolder(asset) { if (asset.type && asset.type.startsWith('image/')) return 'images'; if (asset.type && (asset.type.startsWith('video/') || asset.type.startsWith('audio/'))) return 'media'; return 'documents'; }
  window.GuidebookAssets = { safeName, fileToDataUrl, filesToAssets, dataUrlToBytes, assetFolder };
}());
