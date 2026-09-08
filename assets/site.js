/* Progressive enhancement: the literature remains readable without JavaScript. */
(() => {
  'use strict';
  const form = document.getElementById('library-filters');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();

  if (form) {
    const list = document.getElementById('paper-list');
    const cards = Array.from(list.querySelectorAll('[data-paper-id]'));
    const fields = ['q', 'topic', 'year', 'scope', 'sort'];
    const defaults = {q: '', topic: 'all', year: 'all', scope: 'core', sort: 'newest'};
    const params = new URLSearchParams(location.search);
    const searchIndex = new Map(cards.map(card => [card, normalize(card.dataset.search)]));
    for (const field of fields) {
      const control = form.elements.namedItem(field);
      const value = params.get(field);
      if (value !== null && (field === 'q' || Array.from(control.options).some(option => option.value === value))) {
        control.value = value;
      }
    }

    function apply() {
      const state = Object.fromEntries(fields.map(field => [field, form.elements.namedItem(field).value]));
      const words = normalize(state.q).split(/\s+/).filter(Boolean);
      let count = 0;
      const sorted = [...cards].sort((a, b) => {
        if (state.sort === 'title') return a.dataset.title.localeCompare(b.dataset.title, 'en');
        const time = a.dataset.date.localeCompare(b.dataset.date);
        return (state.sort === 'oldest' ? time : -time) || a.dataset.paperId.localeCompare(b.dataset.paperId);
      });
      const fragment = document.createDocumentFragment();
      for (const card of sorted) {
        const d = card.dataset;
        const matches = (state.scope === 'all' || d.scope === state.scope)
          && (state.topic === 'all' || d.topics.split(' ').includes(state.topic))
          && (state.year === 'all' || d.year === state.year)
          && words.every(word => searchIndex.get(card).includes(word));
        card.hidden = !matches;
        if (matches) count++;
        fragment.appendChild(card);
      }
      list.appendChild(fragment);
      document.getElementById('result-count').textContent = `${count} 篇文献`;
      document.getElementById('empty-state').hidden = count !== 0;
      document.getElementById('topic-hint').hidden = state.topic !== 'multi-agent';
      const labels = ['topic', 'year'].filter(key => state[key] !== 'all')
        .map(key => form.elements.namedItem(key).selectedOptions[0].textContent);
      if (state.q.trim()) labels.push(`“${state.q.trim()}”`);
      if (!labels.length) labels.push({core: '核心与扩展', peripheral: '外围文献', all: '全部收录'}[state.scope]);
      document.getElementById('filter-description').textContent = labels.join(' / ');
      const query = new URLSearchParams();
      fields.forEach(field => { if (state[field] !== defaults[field]) query.set(field, state[field]); });
      const url = location.pathname + (query.size ? '?' + query.toString() : '') + location.hash;
      // Some browsers restrict file:// history updates; filtering must still work.
      try { history.replaceState(null, '', url); } catch (_) { /* No state persistence in this browser. */ }
    }
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', event => { if (event.target.name === 'q') apply(); });
    form.addEventListener('change', apply);
    form.addEventListener('reset', () => queueMicrotask(apply));
    document.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => {
      form.reset();
      queueMicrotask(() => form.elements.namedItem('q').focus());
    }));
    apply();
  }

  let toastTimer;
  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 5000);
  }
  document.querySelectorAll('[data-copy-citation]').forEach(button => {
    button.addEventListener('click', async () => {
      const source = document.getElementById('citation-text');
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(source.textContent);
          copied = true;
        }
      } catch (_) { /* Try the local document fallback below. */ }
      if (!copied) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(source);
        selection.removeAllRanges();
        selection.addRange(range);
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
        if (copied) selection.removeAllRanges();
      }
      toast(copied ? '引用已复制，可粘贴到笔记中。' : '浏览器限制了自动复制。已选中引用，请按 ⌘C / Ctrl+C。');
    });
  });
  document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  document.querySelectorAll('.table-scroll').forEach(table => {
    table.tabIndex = 0;
    table.setAttribute('role', 'region');
    table.setAttribute('aria-label', '数据对比表，可横向滚动');
  });
  if (typeof window.renderMathInElement === 'function') {
    document.querySelectorAll('.prose').forEach(element => window.renderMathInElement(element, {
      delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}],
      throwOnError: false, trust: false, strict: 'ignore',
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
    }));
  }
  const toc = document.querySelector('.report-toc');
  if (toc) {
    if (matchMedia('(max-width: 820px)').matches) toc.querySelector('details').open = false;
    if ('IntersectionObserver' in window) {
      const links = Array.from(toc.querySelectorAll('a[href^="#"]'));
      const observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.isIntersecting);
        if (entry) links.forEach(link => link.classList.toggle('active', decodeURIComponent(link.hash.slice(1)) === entry.target.id));
      }, {rootMargin: '-15% 0px -65% 0px'});
      document.querySelectorAll('.prose h2[id], .prose h3[id]').forEach(heading => observer.observe(heading));
    }
  }
})();
