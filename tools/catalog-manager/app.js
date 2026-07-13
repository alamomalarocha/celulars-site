(() => {
  'use strict';
  const state = { catalog: null, edits: new Map(), group: 'all', model: '', year: '', capacity: '', readAt: null };
  const moneyUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const moneyBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const elements = Object.fromEntries(['canonicalFile','newModels','cpoModels','zeroPrices','lastRead','pendingCount','validationStatus','catalogRows','emptyState','previewRate','modelSearch','yearSearch','capacitySearch','reviewButton','reloadButton','message','reviewDialog','diffList','confirmSaveButton','highConfirmLabel','highConfirm','exportDraftButton','importFile','buildButton'].map(id => [id, document.getElementById(id)]));

  function setMessage(text, type = '') {
    elements.message.textContent = text;
    elements.message.className = `notice ${type}`.trim();
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || (payload.errors || []).join(' | ') || `Erro HTTP ${response.status}`);
    return payload;
  }

  function editKey(id, capacity) { return `${id}::${capacity}`; }
  function effectiveUsd(product, capacity) { return state.edits.get(editKey(product.id, capacity))?.usd ?? product.capacities[capacity].usd; }

  function changes() {
    return [...state.edits.values()].map(edit => ({ id: edit.id, capacity: edit.capacity, usd: edit.usd }));
  }

  function draftCatalog() {
    const draft = structuredClone(state.catalog);
    const products = new Map(draft.products.map(product => [product.id, product]));
    for (const edit of state.edits.values()) products.get(edit.id).capacities[edit.capacity].usd = edit.usd;
    return draft;
  }

  function updatePending() {
    const count = state.edits.size;
    elements.pendingCount.textContent = String(count);
    elements.reviewButton.disabled = count === 0;
  }

  function productMatches(product, capacity) {
    return (state.group === 'all' || product.group === state.group)
      && product.model.toLowerCase().includes(state.model)
      && String(product.year).includes(state.year)
      && capacity.toLowerCase().includes(state.capacity);
  }

  function node(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function statusNode(changed, usd) {
    if (changed) return node('span', 'state-changed', 'Alterado, não salvo');
    if (usd === 0) return node('span', 'state-zero', 'Cadastrado, sem preço');
    return document.createTextNode('Salvo');
  }

  function priceInput(product, capacity) {
    const input = document.createElement('input');
    input.className = 'price-input';
    input.type = 'number'; input.min = '0'; input.step = '0.01'; input.inputMode = 'decimal';
    input.value = effectiveUsd(product, capacity).toFixed(2);
    input.setAttribute('aria-label', `Preço CPO em dólar de ${product.model}, ${capacity}`);
    const key = editKey(product.id, capacity);
    if (state.edits.has(key)) input.classList.add('changed');
    input.addEventListener('input', () => {
      const normalized = input.value.trim() === '' ? NaN : Number(input.value);
      const valid = Number.isFinite(normalized) && normalized >= 0 && Math.round(normalized * 100) === normalized * 100;
      input.classList.toggle('invalid', !valid);
      if (!valid) return setMessage('Corrija o preço destacado. Use número positivo ou zero, com até duas casas decimais.', 'error');
      const original = product.capacities[capacity].usd;
      if (normalized === original) state.edits.delete(key);
      else state.edits.set(key, { id: product.id, model: product.model, capacity, before: original, usd: normalized });
      input.classList.toggle('changed', normalized !== original);
      const row = input.closest('tr');
      const rate = Number(elements.previewRate.value) || 0;
      if (row?.children[6]) row.children[6].replaceChildren(node('span', 'brl-preview', rate > 0 ? moneyBrl.format(normalized * rate) : '-'));
      if (row?.lastElementChild) row.lastElementChild.replaceChildren(statusNode(normalized !== original, normalized));
      updatePending();
      setMessage(state.edits.size ? `${state.edits.size} alteração(ões) aguardando revisão.` : 'Nenhuma alteração pendente.');
    });
    return input;
  }

  function makeCell(label, ...contents) {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    for (const content of contents) cell.append(content instanceof Node ? content : document.createTextNode(String(content)));
    return cell;
  }

  function render() {
    if (!state.catalog) return;
    const fragment = document.createDocumentFragment();
    let visible = 0;
    const rate = Number(elements.previewRate.value) || 0;
    const products = [...state.catalog.products].sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order);
    for (const product of products) {
      for (const capacity of Object.keys(product.capacities)) {
        if (!productMatches(product, capacity)) continue;
        visible += 1;
        const usd = effectiveUsd(product, capacity);
        const row = document.createElement('tr');
        row.append(makeCell('Modelo', node('span', 'model-name', product.model), node('span', 'model-meta', product.family || product.line || '')));
        row.append(makeCell('Ano', String(product.year)));
        row.append(makeCell('Tipo', node('span', `group-badge ${product.group}`, product.group === 'cpo' ? 'CPO' : 'Novo')));
        row.append(makeCell('Cores', node('span', 'color-list', product.colors.join(' · '))));
        row.append(makeCell('Capacidade', node('strong', '', capacity)));
        if (product.group === 'cpo') row.append(makeCell('Preço USD', priceInput(product, capacity)));
        else row.append(makeCell('Preço USD', node('span', 'read-price', moneyUsd.format(usd)), node('span', 'price-state', 'Somente leitura')));
        row.append(makeCell('Prévia BRL', node('span', 'brl-preview', rate > 0 ? moneyBrl.format(usd * rate) : '-')));
        const changed = state.edits.has(editKey(product.id, capacity));
        row.append(makeCell('Estado', statusNode(changed, usd)));
        fragment.append(row);
      }
    }
    elements.catalogRows.replaceChildren(fragment);
    elements.emptyState.hidden = visible > 0;
    updatePending();
  }

  async function loadCatalog({ preserveEdits = false } = {}) {
    setMessage('Lendo fonte canônica...');
    const data = await api('/api/catalog');
    state.catalog = data.catalog; state.readAt = data.readAt;
    if (!preserveEdits) state.edits.clear();
    elements.canonicalFile.textContent = data.canonicalFile;
    elements.newModels.textContent = data.stats.newModels;
    elements.cpoModels.textContent = data.stats.cpoModels;
    elements.zeroPrices.textContent = data.stats.cpoZeroPrices;
    elements.lastRead.textContent = new Date(data.readAt).toLocaleString('pt-BR');
    elements.validationStatus.textContent = 'Validação aprovada';
    elements.validationStatus.classList.remove('error');
    render(); setMessage(`Catálogo carregado. Hash: ${data.contentHash.slice(0, 12)}…`, 'success');
  }

  function showReview() {
    const pending = [...state.edits.values()];
    elements.diffList.replaceChildren(...pending.map(edit => {
      const item = document.createElement('div'); item.className = 'diff-item';
      const description = node('div');
      description.append(node('strong', '', `${edit.model} — ${edit.capacity}`), node('span', '', 'Preço CPO em US$'));
      const values = node('div', 'diff-values');
      values.append(node('s', '', moneyUsd.format(edit.before)), node('strong', '', moneyUsd.format(edit.usd)));
      item.append(description, values);
      return item;
    }));
    const hasHigh = pending.some(edit => edit.usd > 10000);
    elements.highConfirmLabel.hidden = !hasHigh; elements.highConfirm.checked = false;
    elements.reviewDialog.showModal();
  }

  async function saveChanges() {
    const pending = [...state.edits.values()];
    const hasHigh = pending.some(edit => edit.usd > 10000);
    if (hasHigh && !elements.highConfirm.checked) return setMessage('Confirme explicitamente os valores acima de US$ 10.000,00.', 'error');
    elements.confirmSaveButton.disabled = true;
    try {
      const result = await api('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: changes(), confirmHighValues: hasHigh }) });
      elements.reviewDialog.close();
      await loadCatalog();
      setMessage(`${result.changes.length} alteração(ões) salvas. Backup: ${result.backupPath}`, 'success');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { elements.confirmSaveButton.disabled = false; }
  }

  function downloadJson(filename, value) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
    link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function importCatalog(file) {
    try {
      const candidate = JSON.parse(await file.text());
      const result = await api('/api/validate-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ catalog: candidate }) });
      state.edits.clear();
      for (const change of result.changes) state.edits.set(editKey(change.id, change.capacity), { id: change.id, model: change.model, capacity: change.capacity, before: change.before, usd: change.after });
      render();
      setMessage(result.changes.length ? `Importação validada: ${result.changes.length} alteração(ões) preparadas, ainda não salvas.` : 'Importação válida, sem diferenças de preço.', 'success');
      if (result.changes.length) showReview();
    } catch (error) { setMessage(`Importação rejeitada: ${error.message}`, 'error'); }
    finally { elements.importFile.value = ''; }
  }

  document.getElementById('groupFilter').addEventListener('change', event => { state.group = event.target.value; render(); });
  elements.modelSearch.addEventListener('input', () => { state.model = elements.modelSearch.value.trim().toLowerCase(); render(); });
  elements.yearSearch.addEventListener('input', () => { state.year = elements.yearSearch.value.trim(); render(); });
  elements.capacitySearch.addEventListener('input', () => { state.capacity = elements.capacitySearch.value.trim().toLowerCase(); render(); });
  elements.previewRate.addEventListener('input', render);
  elements.reviewButton.addEventListener('click', showReview);
  elements.reloadButton.addEventListener('click', async () => {
    if (state.edits.size && !window.confirm('Descartar alterações não salvas e recarregar?')) return;
    try { await loadCatalog(); } catch (error) { setMessage(error.message, 'error'); }
  });
  elements.confirmSaveButton.addEventListener('click', saveChanges);
  elements.exportDraftButton.addEventListener('click', () => downloadJson('catalog-public-com-alteracoes.json', draftCatalog()));
  elements.importFile.addEventListener('change', () => elements.importFile.files[0] && importCatalog(elements.importFile.files[0]));
  elements.buildButton.addEventListener('click', async () => {
    elements.buildButton.disabled = true; setMessage('Executando validação e build...');
    try {
      const result = await api('/api/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      setMessage(`Build aprovado: ${result.distFiles} arquivos em ${result.distPath}. Hash ${result.catalogHash.slice(0, 12)}…`, 'success');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { elements.buildButton.disabled = false; }
  });
  window.addEventListener('beforeunload', event => { if (state.edits.size) { event.preventDefault(); event.returnValue = ''; } });
  loadCatalog().catch(error => { elements.validationStatus.textContent = 'Falha de validação'; elements.validationStatus.classList.add('error'); setMessage(error.message, 'error'); });
})();
