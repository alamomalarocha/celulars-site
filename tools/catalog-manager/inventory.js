(() => {
  'use strict';

  const moneyUsd = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
  const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const state = {
    activeTab: 'catalog', exists: false, demoMode: false, rows: [], stats: null,
    alerts: [], backups: [], history: [], contentHash: null, catalogHash: null,
    edits: new Map(), preview: null, csvFile: null, csvSource: '', csvPreview: null
  };

  const byId = id => document.getElementById(id);
  const elements = {
    tabs: [...document.querySelectorAll('[data-manager-tab]')],
    views: [...document.querySelectorAll('[data-manager-view]')],
    demoBanner: byId('inventoryDemoBanner'), setup: byId('inventorySetup'),
    summary: byId('inventorySummary'), workspace: byId('inventoryWorkspace'),
    csvTools: byId('inventoryCsvTools'), operations: byId('inventoryOperations'), status: byId('inventoryStatus'),
    file: byId('inventoryFile'), rows: byId('inventoryRows'), empty: byId('inventoryEmptyState'),
    filter: byId('inventoryFilter'), search: byId('inventorySearch'), pending: byId('inventoryPendingCount'),
    reviewButton: byId('reviewInventoryButton'), reloadButton: byId('reloadInventoryButton'),
    initializeButton: byId('previewInventoryInitializeButton'), alerts: byId('inventoryAlerts'),
    backups: byId('inventoryBackups'), history: byId('inventoryHistory'),
    initializeDialog: byId('inventoryInitializeDialog'), initializeSummary: byId('inventoryInitializeSummary'),
    initializeItems: byId('inventoryInitializeItems'), initializeStock: byId('inventoryInitializeStock'),
    initializeReserved: byId('inventoryInitializeReserved'), initializeConfirm: byId('inventoryInitializeConfirm'),
    confirmInitialize: byId('confirmInventoryInitializeButton'), reviewDialog: byId('inventoryReviewDialog'),
    diffList: byId('inventoryDiffList'), warningsSection: byId('inventoryWarningsSection'),
    warnings: byId('inventoryWarnings'), warningConfirm: byId('inventoryWarningConfirm'),
    confirmSave: byId('confirmInventorySaveButton'), message: byId('message'),
    csvInput: byId('inventoryCsvInput'), csvDrop: byId('inventoryCsvDrop'),
    csvFile: byId('inventoryCsvFile'), validateCsv: byId('validateInventoryCsvButton'),
    csvDialog: byId('inventoryCsvReviewDialog'), csvReviewFile: byId('inventoryCsvReviewFile'),
    csvSpreadsheetHash: byId('inventoryCsvSpreadsheetHash'), csvCurrentHash: byId('inventoryCsvCurrentHash'),
    csvErrorsSection: byId('inventoryCsvErrorsSection'), csvErrors: byId('inventoryCsvErrors'),
    csvDiffList: byId('inventoryCsvDiffList'), csvNoChanges: byId('inventoryCsvNoChanges'),
    csvWarningsSection: byId('inventoryCsvWarningsSection'), csvWarnings: byId('inventoryCsvWarnings'),
    csvWarningConfirm: byId('inventoryCsvWarningConfirm'), confirmCsv: byId('confirmInventoryCsvButton')
  };

  function setMessage(text, kind = '') {
    elements.message.textContent = text;
    elements.message.className = `notice${kind ? ` ${kind}` : ''}`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || `Falha HTTP ${response.status}.`), { data, status: response.status });
    return data;
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setTab(tab) {
    state.activeTab = tab;
    document.body.classList.toggle('inventory-active', tab === 'inventory');
    for (const button of elements.tabs) {
      const active = button.dataset.managerTab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    }
    for (const view of elements.views) view.hidden = view.dataset.managerView !== tab;
    if (tab === 'inventory') {
      elements.demoBanner.hidden = !state.demoMode;
      renderInventoryVisibility();
      loadInventory().catch(error => setMessage(error.message, 'error'));
    }
  }

  function originalRow(id) { return state.rows.find(row => row.inventory_id === id); }
  function effectiveRow(row) {
    const edit = state.edits.get(row.inventory_id);
    return edit ? { ...row, ...edit, available: edit.stock_on_hand - edit.reserved } : row;
  }
  function editPayload() { return [...state.edits.entries()].map(([inventory_id, edit]) => ({ inventory_id, ...edit })); }

  function updateEdit(row, field, value, { render = true } = {}) {
    const current = effectiveRow(row);
    const next = {
      stock_on_hand: current.stock_on_hand, reserved: current.reserved,
      low_stock_threshold: current.low_stock_threshold, status: current.status,
      notes: current.notes, [field]: value
    };
    const unchanged = ['stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes']
      .every(key => next[key] === row[key]);
    if (unchanged) state.edits.delete(row.inventory_id);
    else state.edits.set(row.inventory_id, next);
    if (render) renderRows();
    else updatePending();
  }

  function updatePending() {
    elements.pending.textContent = String(state.edits.size);
    elements.reviewButton.disabled = state.edits.size === 0;
  }

  function numberInput(row, field, label) {
    const input = document.createElement('input');
    input.className = 'inventory-input'; input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric';
    input.value = String(effectiveRow(row)[field]);
    input.setAttribute('aria-label', `${label} de ${row.model}, ${row.capacity}`);
    if (state.edits.has(row.inventory_id)) input.classList.add('changed');
    const stageValue = render => {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 0) {
        input.classList.add('invalid');
        return setMessage(`${label} deve ser um numero inteiro maior ou igual a zero.`, 'error');
      }
      const next = { ...effectiveRow(row), [field]: value };
      if (next.reserved > next.stock_on_hand) {
        input.classList.add('invalid');
        return setMessage('A quantidade reservada nao pode superar o estoque fisico.', 'error');
      }
      input.classList.remove('invalid');
      input.classList.toggle('changed', value !== row[field]);
      updateEdit(row, field, value, { render });
      setMessage('Alteracao local pronta para revisao.');
    };
    input.addEventListener('input', () => stageValue(false));
    input.addEventListener('change', () => stageValue(true));
    return input;
  }

  function makeCell(label, ...contents) {
    const cell = document.createElement('td'); cell.dataset.label = label;
    for (const content of contents) cell.append(content instanceof Node ? content : document.createTextNode(String(content)));
    return cell;
  }

  function matches(row) {
    const effective = effectiveRow(row);
    const query = elements.search.value.trim().toLowerCase();
    if (query && !`${row.model} ${row.year} ${row.capacity} ${row.inventory_id}`.toLowerCase().includes(query)) return false;
    switch (elements.filter.value) {
      case 'new': return row.group === 'new';
      case 'cpo': return row.group === 'cpo';
      case 'stock': return effective.stock_on_hand > 0;
      case 'no-stock': return effective.stock_on_hand === 0;
      case 'reserved': return effective.reserved > 0;
      case 'low-stock': return effective.available > 0 && effective.available <= effective.low_stock_threshold;
      case 'paused': return effective.status === 'paused';
      case 'zero-price': return row.price_usd === 0;
      case 'positive-price': return row.price_usd > 0;
      default: return true;
    }
  }

  function renderRows() {
    const fragment = document.createDocumentFragment(); let visible = 0;
    for (const row of state.rows.filter(matches)) {
      visible += 1;
      const effective = effectiveRow(row);
      const tr = document.createElement('tr');
      if (state.edits.has(row.inventory_id)) tr.classList.add('inventory-row-changed');
      const model = node('span', 'model-name', row.model); model.append(node('span', 'model-meta', row.inventory_id));
      tr.append(makeCell('Modelo', model));
      tr.append(makeCell('Grupo', node('span', `group-badge ${row.group}`, row.group === 'cpo' ? 'CPO' : 'Novo')));
      tr.append(makeCell('Ano', row.year));
      tr.append(makeCell('Capacidade', node('strong', '', row.capacity)));
      tr.append(makeCell('Preco USD', row.price_usd > 0 ? moneyUsd.format(row.price_usd) : 'US$ 0,00'));
      tr.append(makeCell('Estoque', numberInput(row, 'stock_on_hand', 'Estoque fisico')));
      tr.append(makeCell('Reservado', numberInput(row, 'reserved', 'Reservado')));
      const availability = node('strong', `inventory-available${effective.available < 0 ? ' inventory-negative' : ''}`, String(effective.available));
      const visualStatus = effective.status === 'archived' ? 'archived' : effective.status === 'paused' ? 'paused' : effective.available === 0 ? 'out_of_stock' : effective.available <= effective.low_stock_threshold ? 'low_stock' : 'available';
      availability.append(node('span', `inventory-state ${visualStatus}`, ({ available: 'Disponivel', low_stock: 'Estoque baixo', out_of_stock: 'Sem estoque', paused: 'Pausado', archived: 'Arquivado' })[visualStatus]));
      tr.append(makeCell('Disponivel', availability));
      tr.append(makeCell('Limite', numberInput(row, 'low_stock_threshold', 'Limite de estoque baixo')));
      const status = document.createElement('select');
      status.className = 'inventory-select'; status.setAttribute('aria-label', `Status de ${row.model}, ${row.capacity}`);
      for (const [value, text] of [['active', 'Ativo'], ['paused', 'Pausado'], ['archived', 'Arquivado']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; option.selected = effective.status === value; status.append(option);
      }
      status.addEventListener('change', () => updateEdit(row, 'status', status.value));
      tr.append(makeCell('Status', status));
      tr.append(makeCell('Atualizado', dateTime.format(new Date(row.updated_at))));
      const notes = document.createElement('textarea');
      notes.className = 'inventory-notes'; notes.maxLength = 500; notes.rows = 2; notes.value = effective.notes;
      notes.setAttribute('aria-label', `Observacao de ${row.model}, ${row.capacity}`);
      notes.addEventListener('change', () => updateEdit(row, 'notes', notes.value));
      tr.append(makeCell('Observacao', notes));
      fragment.append(tr);
    }
    elements.rows.replaceChildren(fragment); elements.empty.hidden = visible > 0; updatePending();
  }

  function renderSummary() {
    const stats = state.stats || {};
    const values = { inventoryStock: stats.stockOnHand, inventoryReserved: stats.reserved, inventoryAvailable: stats.available,
      inventoryModelsStocked: stats.modelsWithStock, inventoryCapacitiesStocked: stats.capacitiesWithStock,
      inventoryLowStock: stats.lowStock, inventoryPaused: stats.paused,
      inventoryZeroPrices: stats.cpoZeroPrices, inventoryPositivePrices: stats.cpoPositivePrices };
    for (const [id, value] of Object.entries(values)) byId(id).textContent = value ?? '-';
  }

  function renderList(container, items, emptyText, itemBuilder) {
    if (!items.length) return container.replaceChildren(node('p', 'inventory-list-empty', emptyText));
    container.replaceChildren(...items.map(itemBuilder));
  }

  function renderOperations() {
    renderList(elements.alerts, state.alerts, 'Nenhum alerta interno.', alert => {
      const item = node('div', `inventory-list-item alert-${alert.type}`);
      item.append(node('strong', '', alert.message), node('span', '', alert.inventory_id)); return item;
    });
    renderList(elements.backups, state.backups, 'Nenhum backup de estoque.', backup => {
      const item = node('div', 'inventory-list-item');
      item.append(node('strong', '', backup.name), node('span', '', backup.valid ? `${Math.round(backup.size / 1024)} KB - ${dateTime.format(new Date(backup.modifiedAt))}` : 'Backup invalido'));
      const button = node('button', 'button secondary compact', 'Restaurar'); button.type = 'button'; button.disabled = !backup.valid;
      button.addEventListener('click', () => restoreBackup(backup.name)); item.append(button); return item;
    });
    renderList(elements.history, state.history, 'Nenhuma operacao registrada.', entry => {
      const item = node('div', 'inventory-list-item');
      item.append(node('strong', '', entry.type || 'operacao'), node('span', '', entry.changedAt ? dateTime.format(new Date(entry.changedAt)) : 'Data indisponivel'));
      if (Number.isInteger(entry.changeCount)) item.append(node('span', '', `${entry.changeCount} alteracao(oes)`)); return item;
    });
  }

  function renderInventoryVisibility() {
    if (state.activeTab !== 'inventory') return;
    elements.demoBanner.hidden = !state.demoMode; elements.setup.hidden = state.exists;
    elements.summary.hidden = !state.exists; elements.workspace.hidden = !state.exists;
    elements.csvTools.hidden = !state.exists; elements.operations.hidden = !state.exists;
  }

  async function loadInventory() {
    if (state.activeTab !== 'inventory') return;
    setMessage('Lendo inventario privado local...');
    const data = await api('/api/inventory');
    state.exists = data.exists; state.demoMode = data.demoMode === true; state.catalogHash = data.catalogHash; state.edits.clear();
    if (!data.exists) {
      state.rows = []; state.stats = null; state.alerts = []; state.contentHash = null; elements.file.textContent = data.canonicalFile;
      renderInventoryVisibility(); return setMessage(`Inventario ainda nao criado. A estrutura tera ${data.suggestedItems} combinacoes.`, 'success');
    }
    state.rows = data.rows; state.stats = data.stats; state.alerts = data.alerts; state.contentHash = data.contentHash;
    elements.file.textContent = `${data.canonicalFile} - hash ${data.contentHash.slice(0, 12)}...`;
    elements.status.textContent = state.demoMode ? 'Demonstracao isolada' : 'Inventario privado valido'; elements.status.classList.remove('error');
    renderInventoryVisibility(); renderSummary(); renderRows(); await loadOperations();
    setMessage(`Inventario carregado: ${data.rows.length} combinacoes privadas.`, 'success');
  }

  async function loadOperations() {
    const [backups, history] = await Promise.all([api('/api/inventory/backups'), api('/api/inventory/history')]);
    state.backups = backups.backups || []; state.history = history.history || []; renderOperations();
  }

  async function previewInitialize() {
    try {
      const data = await api('/api/inventory/initialize-preview'); state.catalogHash = data.catalogHash;
      elements.initializeSummary.textContent = state.demoMode ? 'A demonstracao usa somente numeros ficticios 3/2/1 em pasta temporaria.' : 'Todas as combinacoes serao criadas com estoque e reservado iguais a zero.';
      elements.initializeItems.textContent = data.itemCount; elements.initializeStock.textContent = data.stats.stockOnHand; elements.initializeReserved.textContent = data.stats.reserved;
      elements.initializeConfirm.checked = false; elements.confirmInitialize.disabled = true; elements.initializeDialog.showModal();
    } catch (error) { setMessage(error.message, 'error'); }
  }

  async function initialize() {
    if (!elements.initializeConfirm.checked) return;
    elements.confirmInitialize.disabled = true;
    try {
      await api('/api/inventory/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, expectedCatalogHash: state.catalogHash }) });
      elements.initializeDialog.close(); await loadInventory();
      setMessage(state.demoMode ? 'Inventario ficticio de demonstracao criado.' : 'Estrutura privada criada com estoque real zerado.', 'success');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { elements.confirmInitialize.disabled = !elements.initializeConfirm.checked; }
  }

  function diffDescription(diff) {
    const row = originalRow(diff.inventory_id); const changed = [];
    for (const field of ['stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes']) {
      if (diff.before[field] !== diff.after[field]) changed.push(`${field}: ${String(diff.before[field])} -> ${String(diff.after[field])}`);
    }
    return { title: row ? `${row.model} - ${row.capacity}` : diff.inventory_id, detail: changed.join(' | ') };
  }

  async function previewChanges() {
    try {
      const data = await api('/api/inventory/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: editPayload(), confirmStockWithoutPrice: true }) });
      state.preview = data;
      elements.diffList.replaceChildren(...data.changes.map(diff => {
        const description = diffDescription(diff); const item = node('div', 'diff-item');
        item.append(node('strong', '', description.title), node('span', '', description.detail)); return item;
      }));
      const warnings = data.warnings || []; elements.warningsSection.hidden = warnings.length === 0;
      elements.warnings.replaceChildren(...warnings.map(warning => node('p', 'inventory-warning', warning.message)));
      elements.warningConfirm.checked = false; elements.confirmSave.disabled = data.changes.length === 0; elements.reviewDialog.showModal();
    } catch (error) { setMessage(error.message, 'error'); }
  }

  async function saveChanges() {
    const requiresWarningConfirmation = (state.preview?.warnings || []).length > 0;
    if (requiresWarningConfirmation && !elements.warningConfirm.checked) return setMessage('Confirme explicitamente o estoque CPO com preco zerado.', 'error');
    elements.confirmSave.disabled = true;
    try {
      const data = await api('/api/inventory/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: editPayload(), expectedInventoryHash: state.contentHash, confirmStockWithoutPrice: requiresWarningConfirmation }) });
      elements.reviewDialog.close(); state.preview = null; await loadInventory();
      setMessage(`${data.changes.length} alteracao(oes) salvas. Backup: ${data.backupName || 'nao necessario'}.`, 'success');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { elements.confirmSave.disabled = false; }
  }

  async function restoreBackup(backupName) {
    if (!window.confirm(`Restaurar o backup ${backupName}? Um backup de seguranca sera criado antes.`)) return;
    try {
      const data = await api('/api/inventory/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupName, expectedInventoryHash: state.contentHash, confirm: true }) });
      await loadInventory(); setMessage(`Backup restaurado. Copia de seguranca: ${data.safetyBackupName}.`, 'success');
    } catch (error) { setMessage(error.message, 'error'); }
  }

  function csvSummaryValue(id, value) {
    byId(id).textContent = String(value ?? 0);
  }

  function resetCsvSelection() {
    state.csvFile = null; state.csvSource = ''; state.csvPreview = null;
    elements.csvInput.value = ''; elements.csvFile.textContent = 'Nenhum arquivo selecionado.';
    elements.validateCsv.disabled = true;
  }

  async function selectCsvFile(file) {
    state.csvPreview = null;
    if (!file) return resetCsvSelection();
    if (file.size > 2 * 1024 * 1024) {
      resetCsvSelection();
      return setMessage('O arquivo CSV de estoque excede 2 MB.', 'error');
    }
    state.csvFile = file; state.csvSource = await file.text();
    elements.csvFile.textContent = `${file.name} - ${Math.max(1, Math.round(file.size / 1024))} KB`;
    elements.validateCsv.disabled = false;
    setMessage('Planilha de estoque selecionada. Valide antes de aplicar.');
  }

  function renderCsvPreview(data) {
    state.csvPreview = data;
    elements.csvReviewFile.textContent = `Arquivo: ${state.csvFile?.name || '-'}`;
    elements.csvSpreadsheetHash.textContent = data.spreadsheetHash || '-';
    elements.csvCurrentHash.textContent = data.currentHash || '-';
    const summary = data.summary || {};
    for (const [id, field] of [
      ['inventoryCsvRowsRead', 'rowsRead'], ['inventoryCsvValidRows', 'validRows'],
      ['inventoryCsvChangedRows', 'changedRows'], ['inventoryCsvUnchangedRows', 'unchangedRows'],
      ['inventoryCsvBlankRows', 'blankRows'], ['inventoryCsvInvalidRows', 'invalidRows'],
      ['inventoryCsvConflicts', 'conflicts']
    ]) csvSummaryValue(id, summary[field]);

    const errors = data.errors || [];
    elements.csvErrorsSection.hidden = errors.length === 0;
    elements.csvErrors.replaceChildren(...errors.map(error => {
      const item = node('div', 'csv-error-item');
      item.append(node('strong', '', error.line ? `Linha ${error.line}` : 'Arquivo'), node('span', '', error.message));
      return item;
    }));
    const changes = data.changes || [];
    elements.csvDiffList.replaceChildren(...changes.map(change => {
      const description = diffDescription(change); const item = node('div', 'diff-item');
      item.append(node('strong', '', description.title), node('span', '', description.detail)); return item;
    }));
    elements.csvNoChanges.hidden = changes.length > 0;
    const warnings = data.warnings || [];
    elements.csvWarningsSection.hidden = warnings.length === 0;
    elements.csvWarnings.replaceChildren(...warnings.map(warning => node('div', '', warning.message)));
    elements.csvWarningConfirm.checked = false;
    elements.confirmCsv.disabled = !data.valid || changes.length === 0 || warnings.length > 0;
    elements.csvDialog.showModal();
  }

  async function validateCsv() {
    if (!state.csvFile || !state.csvSource) return;
    elements.validateCsv.disabled = true;
    try {
      const data = await api('/api/inventory/validate.csv', {
        method: 'POST', headers: { 'Content-Type': 'text/csv; charset=utf-8' }, body: state.csvSource
      });
      renderCsvPreview(data);
      setMessage(data.valid ? 'Planilha validada. Revise as diferenças.' : 'A planilha contém erros e não pode ser aplicada.', data.valid ? 'success' : 'error');
    } catch (error) { setMessage(error.message, 'error'); }
    finally { elements.validateCsv.disabled = !state.csvFile; }
  }

  async function applyCsv() {
    const warnings = state.csvPreview?.warnings || [];
    if (warnings.length && !elements.csvWarningConfirm.checked) return setMessage('Confirme explicitamente o estoque CPO com preço zerado.', 'error');
    elements.confirmCsv.disabled = true;
    try {
      const data = await api('/api/inventory/import.csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'X-Inventory-Hash': state.csvPreview.currentHash,
          'X-Confirm-Stock-Without-Price': String(warnings.length > 0),
          'X-Import-Filename': state.csvFile.name
        },
        body: state.csvSource
      });
      elements.csvDialog.close(); resetCsvSelection(); await loadInventory();
      setMessage(`${data.changes.length} alteração(ões) de estoque aplicadas. Backup: ${data.backupName || 'não necessário'}.`, 'success');
    } catch (error) { setMessage(error.message, 'error'); elements.confirmCsv.disabled = false; }
  }

  function downloadCsvErrors() {
    const source = state.csvPreview?.errorReport;
    if (!source) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([source], { type: 'text/csv;charset=utf-8' }));
    link.download = 'erros-estoque-celulars.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  for (const button of elements.tabs) button.addEventListener('click', () => setTab(button.dataset.managerTab));
  elements.filter.addEventListener('change', renderRows); elements.search.addEventListener('input', renderRows);
  elements.reloadButton.addEventListener('click', () => {
    if (state.edits.size && !window.confirm('Descartar alteracoes de estoque ainda nao salvas?')) return;
    loadInventory().catch(error => setMessage(error.message, 'error'));
  });
  elements.initializeButton.addEventListener('click', previewInitialize);
  elements.initializeConfirm.addEventListener('change', () => { elements.confirmInitialize.disabled = !elements.initializeConfirm.checked; });
  elements.confirmInitialize.addEventListener('click', initialize);
  byId('closeInventoryInitializeButton').addEventListener('click', () => elements.initializeDialog.close());
  byId('cancelInventoryInitializeButton').addEventListener('click', () => elements.initializeDialog.close());
  elements.reviewButton.addEventListener('click', previewChanges);
  byId('closeInventoryReviewButton').addEventListener('click', () => elements.reviewDialog.close());
  byId('cancelInventorySaveButton').addEventListener('click', () => elements.reviewDialog.close());
  elements.confirmSave.addEventListener('click', saveChanges);
  elements.csvInput.addEventListener('change', () => selectCsvFile(elements.csvInput.files?.[0]).catch(error => setMessage(error.message, 'error')));
  for (const eventName of ['dragenter', 'dragover']) elements.csvDrop.addEventListener(eventName, event => { event.preventDefault(); elements.csvDrop.classList.add('dragging'); });
  for (const eventName of ['dragleave', 'drop']) elements.csvDrop.addEventListener(eventName, event => { event.preventDefault(); elements.csvDrop.classList.remove('dragging'); });
  elements.csvDrop.addEventListener('drop', event => selectCsvFile(event.dataTransfer?.files?.[0]).catch(error => setMessage(error.message, 'error')));
  elements.validateCsv.addEventListener('click', validateCsv);
  elements.csvWarningConfirm.addEventListener('change', () => { elements.confirmCsv.disabled = !state.csvPreview?.valid || !(state.csvPreview?.changes || []).length || !elements.csvWarningConfirm.checked; });
  elements.confirmCsv.addEventListener('click', applyCsv);
  byId('closeInventoryCsvReviewButton').addEventListener('click', () => elements.csvDialog.close());
  byId('cancelInventoryCsvButton').addEventListener('click', () => elements.csvDialog.close());
  byId('downloadInventoryCsvErrorsButton').addEventListener('click', downloadCsvErrors);
  window.addEventListener('beforeunload', event => { if (state.edits.size) { event.preventDefault(); event.returnValue = ''; } });
})();
