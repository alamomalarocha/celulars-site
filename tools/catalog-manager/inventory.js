(() => {
  'use strict';

  const moneyUsd = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
  const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const state = {
    activeTab: 'catalog', exists: false, demoMode: false, rows: [], stats: null,
    alerts: [], backups: [], history: [], contentHash: null, catalogHash: null,
    edits: new Map(), expanded: new Set(), preview: null, csvFile: null, csvSource: '', csvPreview: null,
    colorOperation: null, colorPreview: null,
    colorCsvFile: null, colorCsvSource: '', colorCsvPreview: null
  };

  const COLOR_SWATCHES = Object.freeze({
    Black: '#1d1d1f', White: '#f5f5f2', Silver: '#d9d9d6', Gold: '#d8c3a5',
    Blue: '#9bb8d3', Green: '#a8b89a', Yellow: '#f2df86', Pink: '#e9b8c1',
    Purple: '#b5a6c9', Red: '#c73b3f', '(PRODUCT)RED': '#c72535', Midnight: '#1d2730',
    Starlight: '#e7dfcf', Graphite: '#555354', 'Space Black': '#29282d',
    'Deep Purple': '#594f63', 'Sierra Blue': '#9fb6c8', 'Pacific Blue': '#5f7883',
    'Alpine Green': '#57685a', 'Black Titanium': '#3b3a38', 'White Titanium': '#dedbd4',
    'Natural Titanium': '#aaa49b', 'Blue Titanium': '#536477', 'Desert Titanium': '#b9a58d',
    'Cosmic Orange': '#d96b34', 'Deep Blue': '#334a70', 'Cloud White': '#f3f2ed',
    'Light Gold': '#d8c79e', 'Sky Blue': '#a9c7dd', 'Mist Blue': '#b8cbd8',
    Sage: '#9fab90', Lavender: '#bcb0ce', 'Soft Pink': '#e6bdc3', Teal: '#5f9695',
    Ultramarine: '#3f5eb4'
  });

  const byId = id => document.getElementById(id);
  const elements = {
    tabs: [...document.querySelectorAll('[data-manager-tab]')],
    views: [...document.querySelectorAll('[data-manager-view]')],
    demoBanner: byId('inventoryDemoBanner'), setup: byId('inventorySetup'),
    summary: byId('inventorySummary'), workspace: byId('inventoryWorkspace'),
    csvTools: byId('inventoryCsvTools'), operations: byId('inventoryOperations'), status: byId('inventoryStatus'),
    file: byId('inventoryFile'), rows: byId('inventoryRows'), empty: byId('inventoryEmptyState'),
    filter: byId('inventoryFilter'), colorFilter: byId('inventoryColorFilter'),
    search: byId('inventorySearch'), pending: byId('inventoryPendingCount'),
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
    csvWarningConfirm: byId('inventoryCsvWarningConfirm'), confirmCsv: byId('confirmInventoryCsvButton'),
    colorCsvInput: byId('inventoryColorCsvInput'), colorCsvDrop: byId('inventoryColorCsvDrop'),
    colorCsvFile: byId('inventoryColorCsvFile'), validateColorCsv: byId('validateInventoryColorCsvButton'),
    colorCsvDialog: byId('inventoryColorCsvReviewDialog'), colorCsvReviewFile: byId('inventoryColorCsvReviewFile'),
    colorCsvSpreadsheetHash: byId('inventoryColorCsvSpreadsheetHash'), colorCsvCurrentHash: byId('inventoryColorCsvCurrentHash'),
    colorCsvErrorsSection: byId('inventoryColorCsvErrorsSection'), colorCsvErrors: byId('inventoryColorCsvErrors'),
    colorCsvDiffList: byId('inventoryColorCsvDiffList'), colorCsvNoChanges: byId('inventoryColorCsvNoChanges'),
    colorCsvWarningsSection: byId('inventoryColorCsvWarningsSection'), colorCsvWarnings: byId('inventoryColorCsvWarnings'),
    colorCsvWarningConfirm: byId('inventoryColorCsvWarningConfirm'), colorCsvSaveConfirm: byId('inventoryColorCsvSaveConfirm'),
    confirmColorCsv: byId('confirmInventoryColorCsvButton'),
    colorDialog: byId('inventoryColorDialog'), colorTitle: byId('inventoryColorTitle'),
    colorContext: byId('inventoryColorContext'), colorGuidance: byId('inventoryColorGuidance'),
    colorEditor: byId('inventoryColorEditor'), colorCurrentStock: byId('inventoryColorCurrentStock'),
    colorNextStock: byId('inventoryColorNextStock'), colorCurrentReserved: byId('inventoryColorCurrentReserved'),
    colorNextReserved: byId('inventoryColorNextReserved'), previewColor: byId('previewInventoryColorButton'),
    colorReviewDialog: byId('inventoryColorReviewDialog'), colorDiffList: byId('inventoryColorDiffList'),
    colorWarningsSection: byId('inventoryColorWarningsSection'), colorWarnings: byId('inventoryColorWarnings'),
    colorWarningConfirm: byId('inventoryColorWarningConfirm'), colorSaveConfirm: byId('inventoryColorSaveConfirm'),
    confirmColorSave: byId('confirmInventoryColorSaveButton')
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

  function actionButton(text, className, handler, label = text) {
    const button = node('button', `button ${className}`, text);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', handler);
    return button;
  }

  function colorSwatch(color) {
    const swatch = node('span', 'inventory-color-swatch');
    swatch.style.setProperty('--inventory-color', COLOR_SWATCHES[color] || '#b8b8bd');
    swatch.setAttribute('aria-hidden', 'true');
    return swatch;
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

  function numberInput(row, field, label, { readOnly = false } = {}) {
    const input = document.createElement('input');
    input.className = 'inventory-input'; input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric';
    input.value = String(effectiveRow(row)[field]);
    input.setAttribute('aria-label', `${label} de ${row.model}, ${row.capacity}`);
    if (readOnly) {
      input.readOnly = true;
      input.classList.add('inventory-input-readonly');
      input.title = 'Total calculado pelas variantes de cor.';
      return input;
    }
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
    const detailedColors = (row.color_variants || []).map(variant => variant.color);
    if (query && !`${row.model} ${row.year} ${row.capacity} ${row.inventory_id} ${detailedColors.join(' ')}`.toLowerCase().includes(query)) return false;
    if (elements.colorFilter.value && !detailedColors.includes(elements.colorFilter.value)) return false;
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
      case 'aggregate': return row.tracking_mode === 'aggregate';
      case 'by-color': return row.tracking_mode === 'by_color';
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
      const byColor = row.tracking_mode === 'by_color';
      tr.append(makeCell('Modo', node('span', `inventory-mode-badge ${byColor ? 'by-color' : 'aggregate'}`, byColor ? 'Por cor' : 'Agregado')));
      tr.append(makeCell('Estoque', numberInput(row, 'stock_on_hand', 'Estoque fisico', { readOnly: byColor })));
      tr.append(makeCell('Reservado', numberInput(row, 'reserved', 'Reservado', { readOnly: byColor })));
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
      const actions = node('div', 'inventory-row-actions');
      if (byColor) {
        const expanded = state.expanded.has(row.inventory_id);
        actions.append(
          actionButton(expanded ? 'Ocultar cores' : 'Ver cores', 'secondary compact', () => {
            if (expanded) state.expanded.delete(row.inventory_id);
            else state.expanded.add(row.inventory_id);
            renderRows();
          }, `${expanded ? 'Ocultar' : 'Exibir'} variantes de ${row.model}, ${row.capacity}`),
          actionButton('Editar cores', 'secondary compact', () => openColorEditor(row, 'update')),
          actionButton('Consolidar estoque', 'secondary compact danger-subtle', () => previewColorOperation({
            action: 'consolidate',
            inventory_id: row.inventory_id
          }, row))
        );
      } else {
        actions.append(actionButton('Detalhar por cor', 'secondary compact', () => openColorEditor(row, 'enable')));
      }
      tr.append(makeCell('Acoes', actions));
      fragment.append(tr);
      if (byColor && state.expanded.has(row.inventory_id)) fragment.append(renderVariantDetail(row));
    }
    elements.rows.replaceChildren(fragment); elements.empty.hidden = visible > 0; updatePending();
  }

  function renderVariantDetail(row) {
    const tr = document.createElement('tr');
    tr.className = 'inventory-color-detail-row';
    const td = document.createElement('td');
    td.colSpan = 14;
    const panel = node('section', 'inventory-color-detail');
    const heading = node('div', 'inventory-color-detail-heading');
    const title = node('div');
    title.append(node('strong', '', `${row.model} - ${row.capacity}`), node('span', '', `${row.color_variants.length} cor(es) detalhada(s)`));
    const remaining = row.colors.filter(color => !row.color_variants.some(variant => variant.color === color));
    const add = actionButton('Adicionar cor', 'secondary compact', () => openColorEditor(row, 'add'));
    add.disabled = remaining.length === 0;
    heading.append(title, add);
    const variants = node('div', 'inventory-color-variant-grid');
    for (const variant of row.color_variants) {
      const card = node('article', 'inventory-color-variant');
      const name = node('div', 'inventory-color-name');
      name.append(colorSwatch(variant.color), node('strong', '', variant.color));
      const values = node('dl', 'inventory-color-values');
      for (const [label, value] of [['Fisico', variant.stock_on_hand], ['Reservado', variant.reserved], ['Disponivel', variant.available]]) {
        const item = document.createElement('div');
        item.append(node('dt', '', label), node('dd', '', String(value)));
        values.append(item);
      }
      const remove = actionButton('Remover', 'secondary compact danger-subtle', () => previewColorOperation({
        action: 'remove',
        inventory_id: row.inventory_id,
        color: variant.color
      }, row), `Remover a cor ${variant.color} de ${row.model}, ${row.capacity}`);
      remove.disabled = variant.stock_on_hand !== 0 || variant.reserved !== 0 || row.color_variants.length === 1;
      card.append(name, values, remove);
      variants.append(card);
    }
    panel.append(heading, variants);
    td.append(panel);
    tr.append(td);
    return tr;
  }

  function colorNumberInput(color, field, value, disabled = false) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.className = 'inventory-input inventory-color-number';
    input.value = String(value);
    input.disabled = disabled;
    input.dataset.field = field;
    input.setAttribute('aria-label', `${field === 'stock_on_hand' ? 'Estoque fisico' : 'Reservado'} da cor ${color}`);
    input.addEventListener('input', updateColorEditorTotals);
    return input;
  }

  function colorEditRow(color, stock, reserved, { selectable = false, selected = false } = {}) {
    const row = node('div', 'inventory-color-edit-row');
    row.dataset.color = color;
    const identity = node('label', 'inventory-color-edit-name');
    let checkbox = null;
    if (selectable) {
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected;
      checkbox.dataset.role = 'select-color';
      identity.append(checkbox);
    }
    identity.append(colorSwatch(color), node('span', '', color));
    const stockInput = colorNumberInput(color, 'stock_on_hand', stock, selectable && !selected);
    const reservedInput = colorNumberInput(color, 'reserved', reserved, selectable && !selected);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        stockInput.disabled = !checkbox.checked;
        reservedInput.disabled = !checkbox.checked;
        if (!checkbox.checked) {
          stockInput.value = '0';
          reservedInput.value = '0';
        }
        updateColorEditorTotals();
      });
    }
    const stockLabel = node('label', 'inventory-color-field', 'Estoque');
    stockLabel.append(stockInput);
    const reservedLabel = node('label', 'inventory-color-field', 'Reservado');
    reservedLabel.append(reservedInput);
    row.append(identity, stockLabel, reservedLabel);
    return row;
  }

  function openColorEditor(row, mode) {
    if (state.edits.size) {
      return setMessage('Salve ou descarte as alteracoes agregadas antes de editar variantes de cor.', 'error');
    }
    state.colorOperation = { mode, row };
    state.colorPreview = null;
    elements.colorEditor.replaceChildren();
    elements.colorContext.textContent = `${row.model} - ${row.capacity}`;
    elements.colorCurrentStock.textContent = String(row.stock_on_hand);
    elements.colorCurrentReserved.textContent = String(row.reserved);

    if (mode === 'enable') {
      elements.colorTitle.textContent = 'Detalhar estoque por cor';
      elements.colorGuidance.textContent = 'Selecione somente as cores que deseja controlar. A soma deve preservar exatamente os totais atuais.';
      for (const color of row.colors) elements.colorEditor.append(colorEditRow(color, 0, 0, { selectable: true }));
    } else if (mode === 'update') {
      elements.colorTitle.textContent = 'Editar variantes de cor';
      elements.colorGuidance.textContent = 'Os totais agregados serao recalculados automaticamente a partir destas variantes.';
      for (const variant of row.color_variants) {
        elements.colorEditor.append(colorEditRow(variant.color, variant.stock_on_hand, variant.reserved));
      }
    } else {
      elements.colorTitle.textContent = 'Adicionar cor ao detalhamento';
      elements.colorGuidance.textContent = 'A nova cor entra com estoque e reservado zerados.';
      const selectLabel = node('label', 'inventory-color-add-label', 'Cor oficial do catalogo');
      const select = document.createElement('select');
      select.className = 'inventory-select inventory-color-add-select';
      select.dataset.role = 'add-color';
      for (const color of row.colors.filter(candidate => !row.color_variants.some(variant => variant.color === candidate))) {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        select.append(option);
      }
      selectLabel.append(select);
      elements.colorEditor.append(selectLabel);
    }
    updateColorEditorTotals();
    elements.colorDialog.showModal();
  }

  function selectedColorEditorRows() {
    return [...elements.colorEditor.querySelectorAll('.inventory-color-edit-row')].filter(editorRow => {
      const checkbox = editorRow.querySelector('[data-role="select-color"]');
      return !checkbox || checkbox.checked;
    });
  }

  function colorVariantsFromEditor() {
    const variants = [];
    for (const editorRow of selectedColorEditorRows()) {
      const stock = Number(editorRow.querySelector('[data-field="stock_on_hand"]').value);
      const reserved = Number(editorRow.querySelector('[data-field="reserved"]').value);
      if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(reserved) || reserved < 0 || reserved > stock) {
        throw new Error(`${editorRow.dataset.color}: use inteiros validos e mantenha reservado menor ou igual ao estoque.`);
      }
      variants.push({ color: editorRow.dataset.color, stock_on_hand: stock, reserved });
    }
    return variants;
  }

  function updateColorEditorTotals() {
    if (!state.colorOperation) return;
    if (state.colorOperation.mode === 'add') {
      elements.colorNextStock.textContent = String(state.colorOperation.row.stock_on_hand);
      elements.colorNextReserved.textContent = String(state.colorOperation.row.reserved);
      return;
    }
    let variants = [];
    try { variants = colorVariantsFromEditor(); } catch {}
    elements.colorNextStock.textContent = String(variants.reduce((total, variant) => total + variant.stock_on_hand, 0));
    elements.colorNextReserved.textContent = String(variants.reduce((total, variant) => total + variant.reserved, 0));
  }

  function operationFromColorEditor() {
    const { mode, row } = state.colorOperation;
    if (mode === 'add') {
      const color = elements.colorEditor.querySelector('[data-role="add-color"]')?.value;
      if (!color) throw new Error('Selecione uma cor oficial para adicionar.');
      return { action: 'add', inventory_id: row.inventory_id, color };
    }
    const color_variants = colorVariantsFromEditor();
    if (!color_variants.length) throw new Error('Selecione pelo menos uma cor.');
    if (mode === 'enable') {
      const stock = color_variants.reduce((total, variant) => total + variant.stock_on_hand, 0);
      const reserved = color_variants.reduce((total, variant) => total + variant.reserved, 0);
      if (stock !== row.stock_on_hand || reserved !== row.reserved) {
        throw new Error(`A soma deve preservar estoque ${row.stock_on_hand} e reservado ${row.reserved}.`);
      }
    }
    return { action: mode, inventory_id: row.inventory_id, color_variants };
  }

  function colorDiffDescription(change, row) {
    const beforeColors = change.before.color_variants.map(variant => `${variant.color}: ${variant.stock_on_hand}/${variant.reserved}`).join(', ') || 'sem detalhamento';
    const afterColors = change.after.color_variants.map(variant => `${variant.color}: ${variant.stock_on_hand}/${variant.reserved}`).join(', ') || 'sem detalhamento';
    return {
      title: `${row.model} - ${row.capacity}`,
      detail: `${change.before.tracking_mode} -> ${change.after.tracking_mode} | estoque ${change.before.stock_on_hand} -> ${change.after.stock_on_hand} | reservado ${change.before.reserved} -> ${change.after.reserved} | cores: ${beforeColors} -> ${afterColors}`
    };
  }

  async function previewColorOperation(operation, row) {
    if (state.edits.size) return setMessage('Salve ou descarte as alteracoes agregadas antes de editar variantes de cor.', 'error');
    try {
      const data = await api('/api/inventory/color/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: [operation], confirmStockWithoutPrice: true })
      });
      state.colorOperation = { mode: operation.action, row, operation };
      state.colorPreview = data;
      elements.colorDiffList.replaceChildren(...data.changes.map(change => {
        const description = colorDiffDescription(change, row);
        const item = node('div', 'diff-item');
        item.append(node('strong', '', description.title), node('span', '', description.detail));
        return item;
      }));
      const warnings = data.warnings || [];
      elements.colorWarningsSection.hidden = warnings.length === 0;
      elements.colorWarnings.replaceChildren(...warnings.map(warning => node('div', '', warning.message)));
      elements.colorWarningConfirm.checked = false;
      elements.colorSaveConfirm.checked = false;
      updateColorSaveState();
      if (elements.colorDialog.open) elements.colorDialog.close();
      elements.colorReviewDialog.showModal();
    } catch (error) {
      setMessage(error.data?.errors?.join(' | ') || error.message, 'error');
    }
  }

  async function previewColorEditor() {
    try {
      const operation = operationFromColorEditor();
      await previewColorOperation(operation, state.colorOperation.row);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  function updateColorSaveState() {
    const warningRequired = (state.colorPreview?.warnings || []).length > 0;
    elements.confirmColorSave.disabled = !elements.colorSaveConfirm.checked || (warningRequired && !elements.colorWarningConfirm.checked);
  }

  async function saveColorOperation() {
    const operation = state.colorOperation?.operation;
    if (!operation || elements.confirmColorSave.disabled) return;
    elements.confirmColorSave.disabled = true;
    try {
      const warnings = state.colorPreview?.warnings || [];
      const data = await api('/api/inventory/color/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: [operation],
          expectedInventoryHash: state.contentHash,
          confirmStockWithoutPrice: warnings.length > 0
        })
      });
      elements.colorReviewDialog.close();
      state.colorOperation = null;
      state.colorPreview = null;
      await loadInventory();
      setMessage(`${data.changes.length} alteracao por cor salva. Backup: ${data.backupName || 'nao necessario'}.`, 'success');
    } catch (error) {
      setMessage(error.data?.errors?.join(' | ') || error.message, 'error');
      elements.confirmColorSave.disabled = false;
    }
  }

  function renderSummary() {
    const stats = state.stats || {};
    const values = { inventoryStock: stats.stockOnHand, inventoryReserved: stats.reserved, inventoryAvailable: stats.available,
      inventoryModelsStocked: stats.modelsWithStock, inventoryCapacitiesStocked: stats.capacitiesWithStock,
      inventoryLowStock: stats.lowStock, inventoryPaused: stats.paused,
      inventoryZeroPrices: stats.cpoZeroPrices, inventoryPositivePrices: stats.cpoPositivePrices,
      inventoryAggregateRecords: stats.aggregateRecords, inventoryByColorRecords: stats.byColorRecords,
      inventoryColorVariants: stats.colorVariants, inventoryColorStock: stats.colorStockOnHand,
      inventoryColorReserved: stats.colorReserved, inventoryColorInconsistencies: stats.colorInconsistencies,
      inventoryCpoByColorZero: stats.cpoByColorZeroPrices };
    for (const [id, value] of Object.entries(values)) byId(id).textContent = value ?? '-';
  }

  function renderColorFilter() {
    const previous = elements.colorFilter.value;
    const colors = [...new Set(state.rows.flatMap(row => (row.color_variants || []).map(variant => variant.color)))].sort((a, b) => a.localeCompare(b, 'en'));
    const first = document.createElement('option');
    first.value = '';
    first.textContent = 'Todas as cores';
    const options = colors.map(color => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color;
      return option;
    });
    elements.colorFilter.replaceChildren(first, ...options);
    elements.colorFilter.value = colors.includes(previous) ? previous : '';
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
    state.expanded = new Set([...state.expanded].filter(id => state.rows.some(row => row.inventory_id === id && row.tracking_mode === 'by_color')));
    elements.file.textContent = `${data.canonicalFile} - hash ${data.contentHash.slice(0, 12)}...`;
    elements.status.textContent = state.demoMode ? 'Demonstracao isolada' : 'Inventario privado valido'; elements.status.classList.remove('error');
    renderInventoryVisibility(); renderSummary(); renderColorFilter(); renderRows(); await loadOperations();
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

  function resetColorCsvSelection() {
    state.colorCsvFile = null;
    state.colorCsvSource = '';
    state.colorCsvPreview = null;
    elements.colorCsvInput.value = '';
    elements.colorCsvFile.textContent = 'Nenhum arquivo selecionado.';
    elements.validateColorCsv.disabled = true;
  }

  async function selectColorCsvFile(file) {
    state.colorCsvPreview = null;
    if (!file) return resetColorCsvSelection();
    if (file.size > 2 * 1024 * 1024) {
      resetColorCsvSelection();
      return setMessage('O arquivo CSV por cor excede 2 MB.', 'error');
    }
    state.colorCsvFile = file;
    state.colorCsvSource = await file.text();
    elements.colorCsvFile.textContent = `${file.name} - ${Math.max(1, Math.round(file.size / 1024))} KB`;
    elements.validateColorCsv.disabled = false;
    setMessage('Planilha por cor selecionada. Valide antes de aplicar.');
  }

  function updateColorCsvSaveState() {
    const preview = state.colorCsvPreview;
    const warningsRequired = (preview?.warnings || []).length > 0;
    elements.confirmColorCsv.disabled = !preview?.valid
      || !(preview?.changes || []).length
      || !elements.colorCsvSaveConfirm.checked
      || (warningsRequired && !elements.colorCsvWarningConfirm.checked);
  }

  function renderColorCsvPreview(data) {
    state.colorCsvPreview = data;
    elements.colorCsvReviewFile.textContent = `Arquivo: ${state.colorCsvFile?.name || '-'}`;
    elements.colorCsvSpreadsheetHash.textContent = data.spreadsheetHash || '-';
    elements.colorCsvCurrentHash.textContent = data.currentHash || '-';
    const summary = data.summary || {};
    for (const [id, field] of [
      ['inventoryColorCsvRowsRead', 'rowsRead'], ['inventoryColorCsvValidRows', 'validRows'],
      ['inventoryColorCsvChangedRows', 'changedRows'], ['inventoryColorCsvUnchangedRows', 'unchangedRows'],
      ['inventoryColorCsvInvalidRows', 'invalidRows'], ['inventoryColorCsvConflicts', 'conflicts'],
      ['inventoryColorCsvRecordsChanged', 'recordsChanged']
    ]) csvSummaryValue(id, summary[field]);

    const errors = data.errors || [];
    elements.colorCsvErrorsSection.hidden = errors.length === 0;
    elements.colorCsvErrors.replaceChildren(...errors.map(error => {
      const item = node('div', 'csv-error-item');
      item.append(node('strong', '', error.line ? `Linha ${error.line}` : 'Arquivo'), node('span', '', error.message));
      return item;
    }));
    const changes = data.changes || [];
    elements.colorCsvDiffList.replaceChildren(...changes.map(change => {
      const row = originalRow(change.inventory_id);
      const item = node('div', 'diff-item');
      item.append(
        node('strong', '', `${row?.model || change.inventory_id} - ${row?.capacity || ''} - ${change.color}`),
        node('span', '', `estoque: ${change.before.stock_on_hand} -> ${change.after.stock_on_hand} | reservado: ${change.before.reserved} -> ${change.after.reserved}`)
      );
      return item;
    }));
    elements.colorCsvNoChanges.hidden = changes.length > 0;
    const warnings = data.warnings || [];
    elements.colorCsvWarningsSection.hidden = warnings.length === 0;
    elements.colorCsvWarnings.replaceChildren(...warnings.map(warning => node('div', '', warning.message)));
    elements.colorCsvWarningConfirm.checked = false;
    elements.colorCsvSaveConfirm.checked = false;
    updateColorCsvSaveState();
    elements.colorCsvDialog.showModal();
  }

  async function validateColorCsv() {
    if (!state.colorCsvFile || !state.colorCsvSource) return;
    elements.validateColorCsv.disabled = true;
    try {
      const data = await api('/api/inventory/color/validate.csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        body: state.colorCsvSource
      });
      renderColorCsvPreview(data);
      setMessage(data.valid ? 'Planilha por cor validada. Revise as diferenças.' : 'A planilha por cor contém erros.', data.valid ? 'success' : 'error');
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      elements.validateColorCsv.disabled = !state.colorCsvFile;
    }
  }

  async function applyColorCsv() {
    if (elements.confirmColorCsv.disabled) return;
    const warnings = state.colorCsvPreview?.warnings || [];
    elements.confirmColorCsv.disabled = true;
    try {
      const data = await api('/api/inventory/color/import.csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'X-Inventory-Hash': state.colorCsvPreview.currentHash,
          'X-Confirm-Stock-Without-Price': String(warnings.length > 0),
          'X-Import-Filename': state.colorCsvFile.name
        },
        body: state.colorCsvSource
      });
      elements.colorCsvDialog.close();
      resetColorCsvSelection();
      await loadInventory();
      setMessage(`${data.changes.length} registro(s) por cor aplicados. Backup: ${data.backupName || 'não necessário'}.`, 'success');
    } catch (error) {
      setMessage(error.message, 'error');
      elements.confirmColorCsv.disabled = false;
    }
  }

  function downloadColorCsvErrors() {
    const source = state.colorCsvPreview?.errorReport;
    if (!source) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([source], { type: 'text/csv;charset=utf-8' }));
    link.download = 'erros-estoque-por-cor-celulars.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  for (const button of elements.tabs) button.addEventListener('click', () => setTab(button.dataset.managerTab));
  elements.filter.addEventListener('change', renderRows);
  elements.colorFilter.addEventListener('change', renderRows);
  elements.search.addEventListener('input', renderRows);
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
  elements.colorCsvInput.addEventListener('change', () => selectColorCsvFile(elements.colorCsvInput.files?.[0]).catch(error => setMessage(error.message, 'error')));
  for (const eventName of ['dragenter', 'dragover']) elements.colorCsvDrop.addEventListener(eventName, event => { event.preventDefault(); elements.colorCsvDrop.classList.add('dragging'); });
  for (const eventName of ['dragleave', 'drop']) elements.colorCsvDrop.addEventListener(eventName, event => { event.preventDefault(); elements.colorCsvDrop.classList.remove('dragging'); });
  elements.colorCsvDrop.addEventListener('drop', event => selectColorCsvFile(event.dataTransfer?.files?.[0]).catch(error => setMessage(error.message, 'error')));
  elements.validateColorCsv.addEventListener('click', validateColorCsv);
  elements.colorCsvWarningConfirm.addEventListener('change', updateColorCsvSaveState);
  elements.colorCsvSaveConfirm.addEventListener('change', updateColorCsvSaveState);
  elements.confirmColorCsv.addEventListener('click', applyColorCsv);
  byId('closeInventoryColorCsvReviewButton').addEventListener('click', () => elements.colorCsvDialog.close());
  byId('cancelInventoryColorCsvButton').addEventListener('click', () => elements.colorCsvDialog.close());
  byId('downloadInventoryColorCsvErrorsButton').addEventListener('click', downloadColorCsvErrors);
  elements.previewColor.addEventListener('click', previewColorEditor);
  byId('closeInventoryColorButton').addEventListener('click', () => elements.colorDialog.close());
  byId('cancelInventoryColorButton').addEventListener('click', () => elements.colorDialog.close());
  byId('closeInventoryColorReviewButton').addEventListener('click', () => elements.colorReviewDialog.close());
  byId('cancelInventoryColorReviewButton').addEventListener('click', () => elements.colorReviewDialog.close());
  elements.colorWarningConfirm.addEventListener('change', updateColorSaveState);
  elements.colorSaveConfirm.addEventListener('change', updateColorSaveState);
  elements.confirmColorSave.addEventListener('click', saveColorOperation);
  window.addEventListener('beforeunload', event => { if (state.edits.size) { event.preventDefault(); event.returnValue = ''; } });
})();
