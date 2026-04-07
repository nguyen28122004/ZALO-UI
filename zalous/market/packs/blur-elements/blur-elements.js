(function (zalous) {
  const STYLE_ID = 'zalous-blur-elements-style';

  const LEVELS = {
    off: '',
    content: '.conv-message.truncate',
    name: '.conv-item-title__name.truncate.grid-item',
    all: '.msg-item[data-id="div_TabMsg_ThrdChItem"], .msg-item[data-id^="div_TabMsg_ThrdChItem"]'
  };

  const api = zalous || {};
  const cfg = (api.getConfig && api.getConfig({})) || {};
  const mode = Object.prototype.hasOwnProperty.call(LEVELS, cfg.mode) ? cfg.mode : 'content';
  const blurMessageWrapper = !!cfg.blurMessageWrapper;

  if (api.registerConfig) {
    api.registerConfig({
      title: 'Blur Elements',
      description: 'Chon vung can lam mo trong danh sach hoi thoai.',
      fields: [
        {
          key: 'mode',
          type: 'select',
          label: 'Muc blur',
          default: 'content',
          options: [
            { value: 'off', label: 'Tat blur cu' },
            { value: 'content', label: 'conv-message truncate (mo noi dung)' },
            { value: 'name', label: 'conv-item-title__name... (mo ten)' },
            { value: 'all', label: 'msg-item[data-id=\"div_TabMsg_ThrdChItem\"] (mo toan bo)' }
          ]
        },
        {
          key: 'blurMessageWrapper',
          type: 'checkbox',
          label: 'Them blur rieng cho .message-content-wrapper',
          default: false
        }
      ]
    });
  }

  const selectors = [];
  if (LEVELS[mode]) selectors.push(LEVELS[mode]);
  if (blurMessageWrapper) selectors.push('.message-content-wrapper');

  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }

  if (!selectors.length) {
    tag.textContent = '';
    return;
  }

  tag.textContent = selectors.map((selector) => ([
    `${selector}{filter:blur(6px) !important;transition:filter .16s ease !important;}`,
    `${selector}:hover{filter:none !important;}`
  ].join('\n'))).join('\n');
})(typeof zalous !== 'undefined' ? zalous : null);
