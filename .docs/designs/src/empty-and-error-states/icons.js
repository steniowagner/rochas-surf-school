(function () {
  var P = {
    waves: '<path d="M2 6c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"/><path d="M2 12c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"/><path d="M2 18c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    camera: '<path d="M3 8h3.5L8 5.5h8L17.5 8H21v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
    download: '<path d="M12 4v11"/><polyline points="7 10.5 12 15.5 17 10.5"/><path d="M4.5 19.5h15"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    'image-plus': '<path d="M20 12.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1.5-1.5H12"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l4.5-4.5 3.5 3.5 2.5-2.5L20 19"/><path d="M18 3v6M15 6h6"/>',
    'user-check': '<circle cx="9" cy="8" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><polyline points="16 11 18 13 22 9"/>',
    'sticky-note': '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><polyline points="8.5 12.2 11 14.7 15.8 9.5"/>',
    'aula-avaliacao': '<path d="M4.5 4.5h15a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5h-1A1.5 1.5 0 0 1 3 16V6a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M12 7.6l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
    star: '<path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z"/>',
    'calendar-x': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4"/>',
    surfboard: '<path d="M17.8 3.2c2.4 1.2 3.4 4.8 1.3 9.4-2.3 5-6.9 8.3-11.2 8.3-1.6 0-2.9-.5-3.8-1.4-.9-.9-1.4-2.2-1.4-3.8 0-4.3 3.3-8.9 8.3-11.2 2.6-1.2 5-1.6 6.8-1.3z"/><path d="M6.5 17.5 16 8"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    'circle-x': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    'calendar-week': '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 15h10"/>',
    'calendar-days': '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    'arrow-up-down': '<path d="M7 4v16M3 8l4-4 4 4"/><path d="M17 20V4M13 16l4 4 4-4"/>',
    filter: '<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>',
    'map-pin': '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-up': '<polyline points="18 15 12 9 6 15"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    filter: '<path d="M3 5h18l-7 8.2V20l-4-2.4v-4.4z"/>',
    'history': '<path d="M3.05 11a9 9 0 1 0 2.6-7.1"/><path d="M3 3v5h5"/><path d="M12 8v4.5l3.5 2"/>',
    cloud: '<path d="M17.5 19H7a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 18 11.3a3.85 3.85 0 0 1-.5 7.7z"/>',
    'cloud-rain': '<path d="M17.5 16H7a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 18 8.3a3.85 3.85 0 0 1-.5 7.7z"/><path d="M8 19.5V21M12 19.5V22M16 19.5V21"/>',
    wind: '<path d="M3 8h9.5a3 3 0 1 0-3-3"/><path d="M3 12h13a3.2 3.2 0 1 1-3.2 3.2"/><path d="M3 16h5.5"/>',
    thermometer: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    droplets: '<path d="M12 3.5s5 5.2 5 8.7a5 5 0 0 1-10 0C7 8.7 12 3.5 12 3.5z"/>',
    github: '<path d="M9 19c-4 1.4-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.3-.3 4.5-1.1 4.5-5A3.9 3.9 0 0 0 17.9 7c.4-1 .3-2.1-.2-3 0 0-1.3-.3-3.2 1.2a9.6 9.6 0 0 0-5 0C7.6 3.7 6.3 4 6.3 4c-.5.9-.6 2-.2 3A3.9 3.9 0 0 0 5 9.5c0 3.9 2.2 4.7 4.5 5-.5.6-.5 1.2-.5 2V20"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-13h4v1.5A5.9 5.9 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    'arrow-up-right': '<path d="M7 17L17 7M8 7h9v9"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4l9-9a4 4 0 0 0-1 -1z"/>',
    languages: '<path d="M3 6h9M7.5 4v2M10.5 6c0 4-3.2 7-7 8"/><path d="M5 11c1.2 2.2 3.2 3.6 5.5 4"/><path d="M12.5 20l4.2-10 4.3 10"/><path d="M14.2 16.4h5.6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    'mail-check': '<path d="M21 12V7.5A2.5 2.5 0 0 0 18.5 5h-13A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19H13"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/><polyline points="16 18 18 20 22 16"/>',
    phone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
    'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.9 3.8M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    'message-circle': '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/>',
    'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><path d="M15 12H3"/>',
    minus: '<path d="M5 12h14"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>',
    'trash-2': '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    send: '<path d="M21 3L3 10.5l7 3 3 7z"/><path d="M21 3l-8 11"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
    'bar-chart': '<path d="M5 20V12M12 20V5M19 20v-6"/>',
    shield: '<path d="M12 3l7 3v6c0 5-3.2 8.2-7 9-3.8-.8-7-4-7-9V6z"/>',
    'user-plus': '<circle cx="9" cy="8" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    'user-x': '<circle cx="9" cy="8" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M17 9l5 5M22 9l-5 5"/>',
    'user-minus': '<circle cx="9" cy="8" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 11h6"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    'settings-2': '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    'wifi-off': '<path d="M3 3l18 18"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7M14.2 10.3A10 10 0 0 1 19 12.9"/><path d="M2 9.2a15 15 0 0 1 4.2-2.6M10.3 5.1A15 15 0 0 1 22 9.2"/><path d="M12 20h.01"/>',
    home: '<path d="M3.5 10.5L12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z"/>',
    loader: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    'search-x': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6M8.8 8.8l4.4 4.4M13.2 8.8l-4.4 4.4"/>',
    'users': '<circle cx="9" cy="8" r="3.6"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16.5 4.6a3.6 3.6 0 0 1 0 6.8"/><path d="M18 20a6.6 6.6 0 0 0-2.4-5"/>'
  };
  function createIcons() {
    var nodes = document.querySelectorAll('[data-lucide]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('data-lucide');
      var d = P[name];
      if (!d || el.getAttribute('data-icon-done') === name) continue;
      var w = el.getAttribute('width') || 24, h = el.getAttribute('height') || 24;
      el.setAttribute('data-icon-done', name);
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.flex = 'none';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
    }
  }
  window.lucide = { createIcons: createIcons };
})();
