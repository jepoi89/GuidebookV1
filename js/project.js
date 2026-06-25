(function () {
  function createId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function emptyProject() {
    const now = new Date().toISOString();
    return {
      id: createId('project'),
      createdAt: now,
      updatedAt: now,
      projectName: 'Untitled Guidebook',
      title: 'A Practical Offline Guide',
      subtitle: 'Everything guests need in one portable website.',
      author: '',
      description: 'Use this guidebook to collect property details, host notes, nearby places, images, and downloadable files into a portable offline website.',
      property: {
        name: 'The Garden Loft', type: 'Private guest suite', address: '',
        description: 'A comfortable home base with the essentials guests need for an easy stay.',
        checkIn: '3:00 PM', checkOut: '11:00 AM', houseRules: 'Please respect quiet hours and leave the space as you found it.'
      },
      host: { name: '', bio: '', phone: '', email: '', contactNote: '' },
      theme: { accent: '#B4602D', layout: 'editorial', fontStyle: 'mixed', cornerStyle: 'soft', overlayStyle: 'transparent' },
      logo: null,
      banner: null,
      backgroundImage: null,
      sections: [
        { id: createId('page'), title: 'Welcome', body: 'Welcome to the property. This guidebook includes arrival details, house notes, and favorite local stops.' },
        { id: createId('page'), title: 'Before You Leave', body: 'Check windows, return keys, gather belongings, and message the host if anything needs attention.' }
      ],
      places: [
        { id: createId('place'), name: 'Closest Grocery', category: 'Groceries', distance: '0.8 mi', address: '', notes: 'Good stop for basics, snacks, and coffee.' },
        { id: createId('place'), name: 'Favorite Breakfast Spot', category: 'Restaurant', distance: '10 min walk', address: '', notes: 'Reliable morning option with quick service.' }
      ],
      images: [],
      documents: [],
      settings: { version: 2 }
    };
  }

  function normalizeProject(raw) {
    const base = emptyProject();
    raw = raw || {};
    return {
      ...base,
      ...raw,
      property: { ...base.property, ...(raw.property || {}) },
      host: { ...base.host, ...(raw.host || {}) },
      theme: { ...base.theme, ...(raw.theme || {}) },
      sections: Array.isArray(raw.sections) ? raw.sections : base.sections,
      places: Array.isArray(raw.places) ? raw.places : base.places,
      images: Array.isArray(raw.images) ? raw.images : [],
      documents: Array.isArray(raw.documents) ? raw.documents : []
    };
  }

  window.GuidebookProject = { createId, emptyProject, normalizeProject };
}());
