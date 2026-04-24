(function (zalous) {
  const STYLE_ID = 'zalous-blur-elements-style';

  const PREVIEW_SELECTORS = [
    '.msg-item .z-conv-message__preview-message',
    '.msg-item .conv-item-body__main',
    '.msg-item .conv-message.truncate'
  ];
  const NAME_SELECTORS = [
    '.msg-item .conv-item-title__name'
  ];
  const MESSAGE_BODY_SELECTORS = [
    '.message-content-wrapper'
  ];

  const PRESETS = {
    off: [],
    preview: PREVIEW_SELECTORS,
    'name-preview': NAME_SELECTORS.concat(PREVIEW_SELECTORS),
    'message-body': MESSAGE_BODY_SELECTORS,
    privacy: NAME_SELECTORS.concat(PREVIEW_SELECTORS, MESSAGE_BODY_SELECTORS)
  };

  const LEGACY_MODE_MAP = {
    off: 'off',
    content: 'preview',
    name: 'name-preview',
    all: 'privacy'
  };

  const api = zalous || {};
  const cfg = (api.getConfig && api.getConfig({})) || {};

  function normalizePreset(value, legacyMode) {
    const preset = String(value || '').trim();
    if (Object.prototype.hasOwnProperty.call(PRESETS, preset)) return preset;
    const legacy = String(legacyMode || '').trim();
    if (Object.prototype.hasOwnProperty.call(LEGACY_MODE_MAP, legacy)) return LEGACY_MODE_MAP[legacy];
    return 'preview';
  }

  const preset = normalizePreset(cfg.preset, cfg.mode);
  const blurRadius = Math.max(2, Math.min(14, Number(cfg.blurRadius) || 6));
  const revealOnHover = cfg.revealOnHover !== false;
  const includeLegacyBody = !!cfg.blurMessageWrapper && preset !== 'message-body' && preset !== 'privacy';

  if (api.registerConfig) {
    api.registerConfig({
      title: 'Làm mờ hội thoại',
      description: 'Chọn preset riêng tư cho danh sách hội thoại và nội dung tin nhắn.',
      fields: [
        {
          key: 'preset',
          type: 'select',
          label: 'Preset',
          default: 'preview',
          options: [
            { value: 'off', label: 'Tắt' },
            { value: 'preview', label: 'Chỉ nội dung preview' },
            { value: 'name-preview', label: 'Tên + preview' },
            { value: 'message-body', label: 'Chỉ nội dung tin nhắn' },
            { value: 'privacy', label: 'Riêng tư: tên + preview + tin nhắn' }
          ]
        },
        {
          key: 'blurRadius',
          type: 'number',
          label: 'Độ mờ',
          default: 6,
          min: 2,
          max: 14,
          step: 1
        },
        {
          key: 'revealOnHover',
          type: 'checkbox',
          label: 'Hiện rõ khi hover/focus',
          default: true
        }
      ]
    });
  }

  const selectors = Array.from(new Set((PRESETS[preset] || []).concat(includeLegacyBody ? MESSAGE_BODY_SELECTORS : [])));
  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }

  document.documentElement.setAttribute('data-zalous-blur-preset', preset);
  document.documentElement.style.setProperty('--zalous-blur-radius', `${blurRadius}px`);

  if (!selectors.length) {
    tag.textContent = '';
    return;
  }

  const protectedScope = ':not(:where(#zalous-controls *,#zalous-market-modal *,#zalous-ext-config-modal *,.zalous-email-prototype-main *))';
  const targetSelector = selectors
    .map((selector) => `${selector}${protectedScope}`)
    .join(',\n');
  const revealSelector = selectors
    .map((selector) => [
      revealOnHover ? `${selector}:hover` : '',
      revealOnHover ? `${selector}:focus-within` : '',
      revealOnHover ? `.msg-item:hover ${selector.replace(/^\.msg-item\s+/, '')}` : '',
      `${selector}[data-zalous-blur-reveal="1"]`
    ].filter(Boolean).join(',\n'))
    .filter(Boolean)
    .join(',\n');

  tag.textContent = [
    `${targetSelector}{`,
    '  filter:blur(var(--zalous-blur-radius,6px)) !important;',
    '  transition:filter .16s ease, opacity .16s ease !important;',
    '  will-change:filter;',
    '}',
    revealSelector ? `${revealSelector}{filter:none !important;}` : '',
    '#zalous-controls,#zalous-market-modal,#zalous-ext-config-modal,.zalous-email-prototype-main{filter:none !important;}'
  ].filter(Boolean).join('\n');
})(typeof zalous !== 'undefined' ? zalous : null);
