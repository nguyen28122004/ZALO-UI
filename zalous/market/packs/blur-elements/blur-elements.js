(function (zalous) {
  const STYLE_ID = 'zalous-blur-elements-style';

  const LEVELS = {
    off: '',
    content: '.conv-message.truncate',
    name: '.conv-item-title__name.truncate.grid-item',
    all: '.msg-item'
  };

  const api = zalous || {};
  const cfg = (api.getConfig && api.getConfig({})) || {};
  const mode = Object.prototype.hasOwnProperty.call(LEVELS, cfg.mode) ? cfg.mode : 'content';
  const blurMessageWrapper = !!cfg.blurMessageWrapper;

  if (api.registerConfig) {
    api.registerConfig({
      title: 'Làm mờ hội thoại',
      description: 'Chọn vùng cần làm mờ trong danh sách hội thoại.',
      fields: [
        {
          key: 'mode',
          type: 'select',
          label: 'Kiểu làm mờ',
          default: 'content',
          options: [
            { value: 'off', label: 'Tắt làm mờ danh sách cũ' },
            { value: 'content', label: 'Làm mờ nội dung xem trước (.conv-message.truncate)' },
            { value: 'name', label: 'Làm mờ tên hội thoại (.conv-item-title__name...)' },
            { value: 'all', label: 'Làm mờ toàn bộ item (.msg-item)' }
          ]
        },
        {
          key: 'blurMessageWrapper',
          type: 'checkbox',
          label: 'Làm mờ thêm vùng tin nhắn cá nhân (.message-content-wrapper)',
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
