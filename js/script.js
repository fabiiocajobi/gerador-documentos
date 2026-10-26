/* =========================================================
   script.js
   Ponto de entrada da aplicação: gerencia o estado do
   orçamento, liga os eventos da interface e orquestra a
   renderização. Depende de utils.js, empresas.js,
   storage.js e pdf.js (carregados antes deste arquivo).
   ========================================================= */

(() => {
  'use strict';

  /* -------------------------------------------------------
     REFERÊNCIAS DE DOM
     ------------------------------------------------------- */
  const el = {
    topbarLogo: document.getElementById('topbarLogo'),
    topbarDocNumber: document.getElementById('topbarDocNumber'),
    heroTitle: document.getElementById('heroTitle'),

    numero: document.getElementById('numeroOrcamento'),
    data: document.getElementById('dataOrcamento'),
    validade: document.getElementById('validadeOrcamento'),

    companySelector: document.getElementById('companySelector'),
    companyInfo: document.getElementById('companyInfo'),
    emitenteEditor: document.getElementById('emitenteEditor'),
    btnRestaurarEmitente: document.getElementById('btnRestaurarEmitente'),
    emitenteRazaoSocial: document.getElementById('emitenteRazaoSocial'),
    emitenteNomeFantasia: document.getElementById('emitenteNomeFantasia'),
    emitenteCnpj: document.getElementById('emitenteCnpj'),
    emitenteEndereco: document.getElementById('emitenteEndereco'),
    emitenteBairro: document.getElementById('emitenteBairro'),
    emitenteCidade: document.getElementById('emitenteCidade'),
    emitenteUf: document.getElementById('emitenteUf'),
    emitenteCep: document.getElementById('emitenteCep'),
    emitenteTelefone: document.getElementById('emitenteTelefone'),
    emitenteEmail: document.getElementById('emitenteEmail'),
    responsavelSelector: document.getElementById('responsavelSelector'),
    responsavelCustom: document.getElementById('responsavelCustom'),
    responsavelNome: document.getElementById('responsavelNome'),
    responsavelCargo: document.getElementById('responsavelCargo'),
    senhaResponsavel: document.getElementById('senhaResponsavel'),
    senhaErro: document.getElementById('senhaErro'),
    senhaTexto: document.getElementById('senhaTexto'),
    signaturePreview: document.getElementById('signaturePreview'),

    typeToggle: document.getElementById('typeToggle'),
    cardTelefonia: document.getElementById('cardTelefonia'),
    cardDeclaracao: document.getElementById('cardDeclaracao'),
    cardItens: document.getElementById('cardItens'),
    cardTotais: document.getElementById('cardTotais'),
    cardObservacoes: document.getElementById('cardObservacoes'),
    itemsCardTitle: document.getElementById('itemsCardTitle'),
    somaFinalLabel: document.getElementById('somaFinalLabel'),

    telSituacaoAtual: document.getElementById('telSituacaoAtual'),
    telSolucaoTexto: document.getElementById('telSolucaoTexto'),
    telPrazoPortabilidade: document.getElementById('telPrazoPortabilidade'),
    telManutencaoPabx: document.getElementById('telManutencaoPabx'),
    telRealizacoesList: document.getElementById('telRealizacoesList'),
    btnAddRealizacao: document.getElementById('btnAddRealizacao'),
    telObservacaoComodato: document.getElementById('telObservacaoComodato'),
    telBeneficiosList: document.getElementById('telBeneficiosList'),
    btnAddBeneficio: document.getElementById('btnAddBeneficio'),
    telConsideracoesFinais: document.getElementById('telConsideracoesFinais'),
    telObservacaoFinal: document.getElementById('telObservacaoFinal'),

    declTitulo: document.getElementById('declTitulo'),
    declReferencia: document.getElementById('declReferencia'),
    declDocumentoRelacionado: document.getElementById('declDocumentoRelacionado'),
    declCorpo: document.getElementById('declCorpo'),
    declCorpoEditor: document.getElementById('declCorpoEditor'),
    declFontSize: document.getElementById('declFontSize'),
    declLocal: document.getElementById('declLocal'),
    declDataTexto: document.getElementById('declDataTexto'),
    declMostrarCliente: document.getElementById('declMostrarCliente'),

    clienteRazaoSocial: document.getElementById('clienteRazaoSocial'),
    clienteDocumento: document.getElementById('clienteDocumento'),
    clienteTelefone: document.getElementById('clienteTelefone'),
    clienteEmail: document.getElementById('clienteEmail'),
    clienteCep: document.getElementById('clienteCep'),
    clienteEndereco: document.getElementById('clienteEndereco'),
    clienteNumero: document.getElementById('clienteNumero'),
    clienteComplemento: document.getElementById('clienteComplemento'),
    clienteBairro: document.getElementById('clienteBairro'),
    clienteCidade: document.getElementById('clienteCidade'),

    itemsTableBody: document.getElementById('itemsTableBody'),
    itemsTable: document.getElementById('itemsTable'),
    emptyItemsHint: document.getElementById('emptyItemsHint'),
    btnAddItem: document.getElementById('btnAddItem'),

    descontoValor: document.getElementById('descontoValor'),
    somaSubtotal: document.getElementById('somaSubtotal'),
    somaDesconto: document.getElementById('somaDesconto'),
    somaFinal: document.getElementById('somaFinal'),

    observacoes: document.getElementById('observacoes'),
    condicoes: document.getElementById('condicoes'),

    toastContainer: document.getElementById('toastContainer'),
    modalOverlay: document.getElementById('modalOverlay'),
    previewBody: document.getElementById('previewBody'),

    anoAtual: document.getElementById('anoAtual'),
  };

  /* -------------------------------------------------------
     ESTADO DA APLICAÇÃO
     ------------------------------------------------------- */
  let state = criarEstadoInicial();
  let itemPendenteRemocao = null;

  /* Responsável editável: liberado somente após informar a senha.
     O desbloqueio vale apenas para a sessão atual (não é salvo no rascunho). */
  let responsavelDesbloqueado = false;
  const hashSenha = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  const SENHA_HASH = '29ibj945i8s';
  const senhaCorreta = (valor) => hashSenha('nv#' + valor) === SENHA_HASH;

  function criarEstadoInicial() {
    return {
      empresaId: 'newnitro',
      emitente: {},
      responsavelId: null,
      responsavelPersonalizado: { nome: '', cargo: '' },
      tipo: 'padrao',
      numero: '',
      data: todayISO(),
      validade: addDaysISO(todayISO(), 15),
      cliente: {
        razaoSocial: '', documento: '', telefone: '', email: '',
        cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '',
      },
      itens: [],
      desconto: { tipo: 'valor', valor: 0 },
      observacoes: '',
      condicoes: 'Primeira mensalidade paga no ato da contratação.',
      telefonia: criarTelefoniaInicial(),
      declaracao: criarDeclaracaoInicial(),
    };
  }

  /** Valores padrão do bloco de telefonia — tudo em branco, pronto para o usuário preencher. */
  function criarTelefoniaInicial() {
    return {
      situacaoAtual: '',
      solucaoTexto: '',
      realizacoes: [],
      observacaoComodato: '',
      prazoPortabilidadeHoras: '',
      manutencaoPabx: false,
      beneficios: [],
      consideracoesFinais: '',
      observacaoFinal: '',
    };
  }

  /** Campos livres do documento em papel timbrado. */
  function criarDeclaracaoInicial() {
    return {
      titulo: '',
      referencia: '',
      documentoRelacionado: '',
      corpo: '',
      corpoHtml: '',
      local: '',
      dataTexto: '',
      mostrarCliente: true,
    };
  }

  /* -------------------------------------------------------
     CÁLCULOS
     ------------------------------------------------------- */
  window.calcularSubtotal = (itens) =>
    itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0), 0);

  window.calcularValorDesconto = (subtotal, desconto) => {
    if (!desconto || !desconto.valor) return 0;
    if (desconto.tipo === 'percentual') {
      return subtotal * (Number(desconto.valor) / 100);
    }
    return Number(desconto.valor) || 0;
  };

  /* -------------------------------------------------------
     RENDER: EMPRESA
     ------------------------------------------------------- */
  const camposEmitente = [
    'razaoSocial', 'nomeFantasia', 'cnpj', 'endereco', 'bairro', 'cidade',
    'uf', 'cep', 'telefone', 'email',
  ];

  const responsavelPodeEditarEmitente = (responsavel) =>
    Boolean(responsavel && ['Fabio Silva', 'Fabio Castro'].includes(responsavel.nome));

  const renderEditorEmitente = (empresa, responsavel) => {
    const habilitado = responsavelPodeEditarEmitente(responsavel);
    el.emitenteEditor.hidden = !habilitado;
    if (!habilitado) return;
    camposEmitente.forEach((campo) => {
      const input = el[`emitente${campo[0].toUpperCase()}${campo.slice(1)}`];
      if (input) input.value = empresa[campo] || '';
    });
  };

  const renderEmpresa = () => {
    const empresa = getEmpresaDocumento(state);

    el.topbarLogo.src = empresa.logo;
    el.topbarLogo.alt = empresa.nomeFantasia;

    el.companyInfo.innerHTML = `
      ${campoInfo('Razão social', empresa.razaoSocial)}
      ${campoInfo('Nome fantasia', empresa.nomeFantasia)}
      ${campoInfo('CNPJ', empresa.cnpj)}
      ${campoInfo('Cidade / Bairro', `${cidadeUF(empresa)} — ${empresa.bairro}`)}
      ${campoInfo('Endereço', empresa.endereco)}
      ${campoInfo('CEP', empresa.cep)}
      ${campoInfo('Telefone', empresa.telefone)}
      ${campoInfo('E-mail', empresa.email || '—')}
    `;

    // Garante que o responsável selecionado é válido para a empresa atual;
    // caso contrário, cai para o primeiro responsável cadastrado.
    const personalizadoAtivo = state.responsavelId === RESPONSAVEL_PERSONALIZADO_ID && responsavelDesbloqueado;
    const responsavelValido = personalizadoAtivo
      || empresa.responsaveis.some((r) => r.id === state.responsavelId);
    if (!responsavelValido) {
      // Prefere o primeiro responsável sem bloqueio; se todos estiverem
      // protegidos, usa o primeiro (a assinatura aparece bloqueada até a senha).
      const acessivel = empresa.responsaveis.find((r) => !assinaturaBloqueada(r));
      state.responsavelId = (acessivel || empresa.responsaveis[0]).id;
    }

    el.responsavelSelector.innerHTML = empresa.responsaveis.map((r) => `
      <label class="responsavel-option ${r.id === state.responsavelId ? 'is-active' : ''} ${assinaturaBloqueada(r) ? 'is-locked' : ''}" data-responsavel="${r.id}">
        <input type="radio" name="responsavel" value="${r.id}" ${r.id === state.responsavelId ? 'checked' : ''}>
        <span class="responsavel-option__avatar">${assinaturaBloqueada(r) ? '🔒' : escapeHTML(iniciais(r.nome))}</span>
        <span class="responsavel-option__text">
          <span class="responsavel-option__name">${escapeHTML(r.nome)}</span>
          <span class="responsavel-option__role">${escapeHTML(r.cargo)}</span>
        </span>
      </label>
    `).join('') + `
      <label class="responsavel-option responsavel-option--custom ${personalizadoAtivo ? 'is-active' : ''}" data-responsavel="${RESPONSAVEL_PERSONALIZADO_ID}">
        <input type="radio" name="responsavel" value="${RESPONSAVEL_PERSONALIZADO_ID}" ${personalizadoAtivo ? 'checked' : ''}>
        <span class="responsavel-option__avatar">${responsavelDesbloqueado ? '+' : '🔒'}</span>
        <span class="responsavel-option__text">
          <span class="responsavel-option__name">Outro responsável</span>
          <span class="responsavel-option__role">Nome e cargo editáveis</span>
        </span>
      </label>
    `;

    el.responsavelCustom.hidden = !personalizadoAtivo;
    el.responsavelNome.value = state.responsavelPersonalizado?.nome || '';
    el.responsavelCargo.value = state.responsavelPersonalizado?.cargo || '';

    renderAssinatura();
    renderEditorEmitente(empresa, getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado));

    // Sincroniza o rádio selecionado visualmente
    el.companySelector.querySelectorAll('.company-option').forEach((opt) => {
      const input = opt.querySelector('input');
      input.checked = opt.dataset.empresa === state.empresaId;
    });
  };

  /** Renderiza a prévia de assinatura do responsável comercial selecionado */
  const renderAssinatura = () => {
    const empresa = getEmpresaDocumento(state);
    const responsavel = getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado);

    const imagemAssinatura = assinaturaBloqueada(responsavel)
      ? `<span class="signature-preview__img-fallback" style="display:flex">
          <svg viewBox="0 0 24 24" class="icon"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          <span>Assinatura protegida por senha</span>
        </span>`
      : `<img class="signature-preview__img" src="${responsavel.assinatura}" alt="Assinatura de ${escapeHTML(responsavel.nome)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <span class="signature-preview__img-fallback">
        <svg viewBox="0 0 24 24" class="icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
        <span>Assinatura pendente</span>
      </span>`;

    el.signaturePreview.innerHTML = `
      ${imagemAssinatura}
      <div class="signature-preview__info">
        <div class="signature-preview__name">${escapeHTML(responsavel.nome)}</div>
        <div class="signature-preview__role">${escapeHTML(responsavel.cargo)}</div>
        <div class="signature-preview__company">${escapeHTML(empresa.nomeFantasia)}</div>
      </div>
    `;
  };

  const campoInfo = (label, value) => `
    <div class="company-info__item">
      <span class="label">${escapeHTML(label)}</span>
      <span class="value">${escapeHTML(value)}</span>
    </div>
  `;

  /* -------------------------------------------------------
     RENDER: TIPO DE DOCUMENTO
     ------------------------------------------------------- */
  const renderTipo = () => {
    const isTelefonia = state.tipo === 'telefonia';
    const isDeclaracao = state.tipo === 'declaracao';

    el.typeToggle.querySelectorAll('.type-toggle__btn').forEach((btn) => {
      const ativo = btn.dataset.tipo === state.tipo;
      btn.classList.toggle('is-active', ativo);
      btn.setAttribute('aria-checked', String(ativo));
    });

    el.cardTelefonia.classList.toggle('is-hidden', !isTelefonia);
    el.cardDeclaracao.classList.toggle('is-hidden', !isDeclaracao);
    el.cardItens.classList.toggle('is-hidden', isDeclaracao);
    el.cardTotais.classList.toggle('is-hidden', isDeclaracao);
    el.cardObservacoes.classList.toggle('is-hidden', isDeclaracao);
    el.heroTitle.textContent = isDeclaracao
      ? 'Documento em Papel Timbrado / Declaração'
      : 'Orçamento para Prestação de Serviços e Produtos de Telecomunicações';
    el.itemsCardTitle.textContent = isTelefonia ? 'Investimento (linhas, números e equipamentos)' : 'Produtos e serviços';
    el.somaFinalLabel.textContent = isTelefonia ? 'Total mensal' : 'Valor final';
  };

  /* -------------------------------------------------------
     RENDER: LISTAS EDITÁVEIS (usado em Realizações e Benefícios)
     ------------------------------------------------------- */
  /**
   * Renderiza uma lista editável de strings dentro de um container.
   * @param {HTMLElement} container
   * @param {string[]} valores
   * @param {string} placeholder
   */
  const renderEditableList = (container, valores, placeholder) => {
    if (!valores.length) {
      container.innerHTML = `<p class="editable-list__empty">Nenhum item. Clique em "Adicionar" para incluir.</p>`;
      return;
    }
    container.innerHTML = valores.map((valor, index) => `
      <div class="editable-list__row" data-index="${index}">
        <input type="text" value="${escapeHTML(valor)}" placeholder="${escapeHTML(placeholder)}" data-list-input>
        <button type="button" class="editable-list__remove" data-list-remove aria-label="Remover">
          <svg viewBox="0 0 24 24" class="icon"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    `).join('');
  };

  /** Liga eventos de input/remoção de uma lista editável a um array do estado */
  const bindEditableList = (container, getArray, onChange, placeholder) => {
    container.addEventListener('input', (e) => {
      const input = e.target.closest('[data-list-input]');
      if (!input) return;
      const row = input.closest('[data-index]');
      const index = Number(row.dataset.index);
      const arr = getArray();
      arr[index] = input.value;
      onChange();
    });
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-list-remove]');
      if (!btn) return;
      const row = btn.closest('[data-index]');
      const index = Number(row.dataset.index);
      const arr = getArray();
      arr.splice(index, 1);
      renderEditableList(container, arr, placeholder);
      onChange();
    });
  };

  const renderTelefoniaListas = () => {
    renderEditableList(el.telRealizacoesList, state.telefonia.realizacoes, 'Ex.: Portabilidade de 4 linhas telefônicas para a {empresa}');
    renderEditableList(el.telBeneficiosList, state.telefonia.beneficios, 'Ex.: Suporte técnico especializado');
  };

  /* -------------------------------------------------------
     RENDER: TABELA DE ITENS
     ------------------------------------------------------- */
  const renderItens = () => {
    el.itemsTableBody.innerHTML = state.itens.map((item, index) => criarLinhaHTML(item, index)).join('');
    const vazio = state.itens.length === 0;
    el.emptyItemsHint.classList.toggle('is-visible', vazio);
    el.itemsTable.classList.toggle('is-empty', vazio);
    atualizarTotais();
  };

  const criarLinhaHTML = (item, index) => `
    <tr data-id="${item.id}">
      <td class="col-item"><span class="item-index">${index + 1}</span></td>
      <td class="col-desc">
        <input
          type="text"
          class="descricao-input"
          value="${escapeHTML(item.descricao)}"
          placeholder="Digite uma descrição"
          data-field="descricao"
        >
      </td>
      <td class="col-qtd">
        <input type="text" class="qtd-input" value="${formatQuantidade(item.quantidade)}" inputmode="decimal" data-field="quantidade">
      </td>
      <td class="col-valor">
        <input type="text" class="valor-input" value="${maskCurrencyInput(String(Math.round(item.valorUnitario * 100)))}" inputmode="decimal" data-field="valorUnitario">
      </td>
      <td class="col-subtotal">
        <span class="subtotal-cell">${formatCurrency(item.quantidade * item.valorUnitario)}</span>
      </td>
      <td class="col-acao">
        <button type="button" class="btn-remove-item" data-remove-item aria-label="Remover item">
          <svg viewBox="0 0 24 24" class="icon"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </td>
    </tr>
  `;

  const adicionarItem = () => {
    state.itens.push({
      id: generateId(),
      descricao: '',
      quantidade: 1,
      valorUnitario: 0,
    });
    renderItens();
    persistirRascunho();
    // foca a descrição do novo item
    const linhas = el.itemsTableBody.querySelectorAll('tr');
    const ultima = linhas[linhas.length - 1];
    ultima?.querySelector('.descricao-input')?.focus();
  };

  const removerItem = (id) => {
    state.itens = state.itens.filter((i) => i.id !== id);
    renderItens();
    persistirRascunho();
    mostrarToast('Item removido do orçamento.', 'info');
  };

  const atualizarItemCampo = (id, campo, valor) => {
    const item = state.itens.find((i) => i.id === id);
    if (!item) return;
    item[campo] = valor;

    // Atualiza apenas o subtotal da linha, sem re-renderizar tudo (evita perder foco)
    const linha = el.itemsTableBody.querySelector(`tr[data-id="${id}"]`);
    if (linha) {
      const subtotalCell = linha.querySelector('.subtotal-cell');
      subtotalCell.textContent = formatCurrency(item.quantidade * item.valorUnitario);
    }
    atualizarTotais();
    persistirRascunhoDebounced();
  };

  /* -------------------------------------------------------
     RENDER: TOTAIS
     ------------------------------------------------------- */
  const atualizarTotais = () => {
    const subtotal = calcularSubtotal(state.itens);
    const valorDesconto = calcularValorDesconto(subtotal, state.desconto);
    const final = Math.max(subtotal - valorDesconto, 0);

    el.somaSubtotal.textContent = formatCurrency(subtotal);
    el.somaDesconto.textContent = `- ${formatCurrency(valorDesconto)}`;
    el.somaFinal.textContent = formatCurrency(final);
  };

  /* -------------------------------------------------------
     TOASTS
     ------------------------------------------------------- */
  const mostrarToast = (mensagem, tipo = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.textContent = mensagem;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  };

  /* -------------------------------------------------------
     MODAIS
     ------------------------------------------------------- */
  const abrirModal = (idModal) => {
    el.modalOverlay.classList.add('is-open');
    document.getElementById(idModal)?.classList.add('is-active');
  };

  const fecharModais = () => {
    el.modalOverlay.classList.remove('is-open');
    document.querySelectorAll('.modal').forEach((m) => m.classList.remove('is-active'));
  };

  /* -------------------------------------------------------
     COLETA / APLICAÇÃO DE ESTADO A PARTIR DO FORMULÁRIO
     ------------------------------------------------------- */
  const coletarClienteDoDOM = () => {
    state.cliente = {
      razaoSocial: el.clienteRazaoSocial.value.trim(),
      documento: el.clienteDocumento.value.trim(),
      telefone: el.clienteTelefone.value.trim(),
      email: el.clienteEmail.value.trim(),
      cep: el.clienteCep.value.trim(),
      endereco: el.clienteEndereco.value.trim(),
      numero: el.clienteNumero.value.trim(),
      complemento: el.clienteComplemento.value.trim(),
      bairro: el.clienteBairro.value.trim(),
      cidade: el.clienteCidade.value.trim(),
    };
  };

  const aplicarEstadoAoDOM = () => {
    state.emitente = state.emitente || {};
    el.numero.value = state.numero;
    el.topbarDocNumber.textContent = state.numero;
    el.data.value = state.data;
    el.validade.value = state.validade;

    el.clienteRazaoSocial.value = state.cliente.razaoSocial || '';
    el.clienteDocumento.value = state.cliente.documento || '';
    el.clienteTelefone.value = state.cliente.telefone || '';
    el.clienteEmail.value = state.cliente.email || '';
    el.clienteCep.value = state.cliente.cep || '';
    el.clienteEndereco.value = state.cliente.endereco || '';
    el.clienteNumero.value = state.cliente.numero || '';
    el.clienteComplemento.value = state.cliente.complemento || '';
    el.clienteBairro.value = state.cliente.bairro || '';
    el.clienteCidade.value = state.cliente.cidade || '';

    el.observacoes.value = state.observacoes || '';
    el.condicoes.value = state.condicoes || '';

    el.descontoValor.value = state.desconto.valor
      ? (state.desconto.tipo === 'percentual'
        ? String(state.desconto.valor).replace('.', ',')
        : maskCurrencyInput(String(Math.round(state.desconto.valor * 100))))
      : '';

    document.querySelectorAll('.discount-toggle__btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tipo === state.desconto.tipo);
    });

    el.telSituacaoAtual.value = state.telefonia.situacaoAtual || '';
    el.telSolucaoTexto.value = state.telefonia.solucaoTexto || '';
    el.telPrazoPortabilidade.value = state.telefonia.prazoPortabilidadeHoras || '';
    el.telManutencaoPabx.checked = Boolean(state.telefonia.manutencaoPabx);
    el.telObservacaoComodato.value = state.telefonia.observacaoComodato || '';
    el.telConsideracoesFinais.value = state.telefonia.consideracoesFinais || '';
    el.telObservacaoFinal.value = state.telefonia.observacaoFinal || '';
    renderTelefoniaListas();

    const declaracao = { ...criarDeclaracaoInicial(), ...(state.declaracao || {}) };
    state.declaracao = declaracao;
    el.declTitulo.value = declaracao.titulo || '';
    el.declReferencia.value = declaracao.referencia || '';
    el.declDocumentoRelacionado.value = declaracao.documentoRelacionado || '';
    el.declCorpo.value = declaracao.corpo || '';
    el.declCorpoEditor.innerHTML = declaracao.corpoHtml
      ? sanitizeRichTextHTML(declaracao.corpoHtml)
      : negritoCaixaAlta(declaracao.corpo || '').replace(/\n/g, '<br>');
    el.declLocal.value = declaracao.local || '';
    el.declDataTexto.value = declaracao.dataTexto || '';
    el.declMostrarCliente.checked = declaracao.mostrarCliente !== false;

    renderTipo();
    renderEmpresa();
    renderItens();
  };

  /* -------------------------------------------------------
     PERSISTÊNCIA (LocalStorage)
     ------------------------------------------------------- */
  const persistirRascunho = () => {
    coletarClienteDoDOM();
    saveDraft(state);
  };
  const persistirRascunhoDebounced = debounce(persistirRascunho, 500);

  /* -------------------------------------------------------
     AÇÕES PRINCIPAIS
     ------------------------------------------------------- */
  const iniciarNovoOrcamento = ({ manterContador = false } = {}) => {
    state = criarEstadoInicial();
    state.numero = manterContador ? (peekCurrentOrcamentoNumber() || getNextOrcamentoNumber()) : getNextOrcamentoNumber();
    aplicarEstadoAoDOM();
    clearDraft();
    persistirRascunho();
  };

  const limparFormulario = () => {
    const numeroAtual = state.numero;
    state = criarEstadoInicial();
    state.numero = numeroAtual;
    aplicarEstadoAoDOM();
    persistirRascunho();
    mostrarToast('Formulário limpo.', 'info');
  };

  const validarCamposObrigatorios = () => {
    coletarClienteDoDOM();
    let valido = true;

    if (state.tipo === 'declaracao') {
      const camposDeclaracao = [
        { input: el.declTitulo, valor: el.declTitulo.value.trim() },
        { input: el.declCorpoEditor, valor: el.declCorpoEditor.innerText.trim() },
      ];
      camposDeclaracao.forEach(({ input, valor }) => {
        const ok = Boolean(valor);
        setFieldValidity(input, ok);
        if (!ok) valido = false;
      });
      if (!valido) mostrarToast('Preencha o título e o texto da declaração.', 'error');
      return valido;
    }

    const obrigatorios = [
      { input: el.clienteRazaoSocial, valor: state.cliente.razaoSocial },
      { input: el.clienteDocumento, valor: state.cliente.documento },
      { input: el.clienteTelefone, valor: state.cliente.telefone },
    ];

    obrigatorios.forEach(({ input, valor }) => {
      const ok = Boolean(valor);
      setFieldValidity(input, ok);
      if (!ok) valido = false;
    });

    if (el.clienteEmail.value && !isValidEmail(el.clienteEmail.value)) {
      setFieldValidity(el.clienteEmail, false);
      valido = false;
    } else {
      setFieldValidity(el.clienteEmail, true);
    }

    if (state.itens.length === 0) {
      mostrarToast('Adicione ao menos um item ao orçamento.', 'error');
      valido = false;
    }

    if (!valido) {
      mostrarToast('Preencha os campos obrigatórios destacados.', 'error');
    }

    return valido;
  };

  const montarEstadoParaExportacao = () => {
    coletarClienteDoDOM();
    state.data = el.data.value || todayISO();
    state.validade = el.validade.value || state.validade;
    state.observacoes = el.observacoes.value.trim();
    state.condicoes = el.condicoes.value.trim();

    state.telefonia.situacaoAtual = el.telSituacaoAtual.value.trim();
    state.telefonia.solucaoTexto = el.telSolucaoTexto.value.trim();
    state.telefonia.prazoPortabilidadeHoras = Number(el.telPrazoPortabilidade.value) || 72;
    state.telefonia.manutencaoPabx = el.telManutencaoPabx.checked;
    state.telefonia.observacaoComodato = el.telObservacaoComodato.value.trim();
    state.telefonia.consideracoesFinais = el.telConsideracoesFinais.value.trim();
    state.telefonia.observacaoFinal = el.telObservacaoFinal.value.trim();

    state.declaracao = {
      titulo: el.declTitulo.value.trim(),
      referencia: el.declReferencia.value.trim(),
      documentoRelacionado: el.declDocumentoRelacionado.value.trim(),
      corpo: el.declCorpoEditor.innerText.trim(),
      corpoHtml: sanitizeRichTextHTML(el.declCorpoEditor.innerHTML),
      local: el.declLocal.value.trim(),
      dataTexto: el.declDataTexto.value.trim(),
      mostrarCliente: el.declMostrarCliente.checked,
    };

    const responsavelAtual = getResponsavel(
      getEmpresaDocumento(state),
      state.responsavelId,
      state.responsavelPersonalizado,
    );
    if (responsavelPodeEditarEmitente(responsavelAtual)) {
      state.emitente = state.emitente || {};
      camposEmitente.forEach((campo) => {
        const input = el[`emitente${campo[0].toUpperCase()}${campo.slice(1)}`];
        state.emitente[campo] = input?.value.trim() || '';
      });
    }

    return state;
  };

  /* -------------------------------------------------------
     EVENTOS: TOPBAR
     ------------------------------------------------------- */
  document.getElementById('btnNovo').addEventListener('click', () => abrirModal('modalNovo'));
  document.getElementById('confirmNovo').addEventListener('click', () => {
    iniciarNovoOrcamento();
    fecharModais();
    mostrarToast('Novo orçamento criado.', 'success');
  });

  document.getElementById('btnSalvar').addEventListener('click', () => {
    persistirRascunho();
    mostrarToast('Rascunho salvo com sucesso.', 'success');
  });

  document.getElementById('btnCarregar').addEventListener('click', () => {
    const draft = loadDraft();
    if (!draft) {
      mostrarToast('Nenhum rascunho salvo foi encontrado.', 'info');
      return;
    }
    abrirModal('modalCarregar');
  });

  document.getElementById('confirmCarregar').addEventListener('click', () => {
    const draft = loadDraft();
    if (draft) {
      state = { ...criarEstadoInicial(), ...draft };
      state.telefonia = { ...criarTelefoniaInicial(), ...(draft.telefonia || {}) };
      state.declaracao = { ...criarDeclaracaoInicial(), ...(draft.declaracao || {}) };
      aplicarEstadoAoDOM();
      mostrarToast('Rascunho carregado.', 'success');
    }
    fecharModais();
  });

  document.getElementById('descartarRascunho').addEventListener('click', () => {
    clearDraft();
    fecharModais();
    mostrarToast('Rascunho descartado.', 'info');
  });

  document.getElementById('btnLimpar').addEventListener('click', () => abrirModal('modalLimpar'));
  document.getElementById('confirmLimpar').addEventListener('click', () => {
    limparFormulario();
    fecharModais();
  });

  /**
   * Garante que a assinatura do responsável selecionado esteja liberada antes
   * de gerar o documento. Se estiver protegida, pede a senha e, ao acertar,
   * executa a ação que o usuário tinha pedido (visualizar ou imprimir).
   * @returns {boolean} true se pode seguir agora
   */
  const exigirAssinaturaLiberada = (acao) => {
    const empresa = getEmpresaDocumento(state);
    const responsavel = getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado);
    if (!assinaturaBloqueada(responsavel)) return true;

    pedirSenha({
      texto: `A assinatura de ${responsavel.nome} é protegida. Digite a senha para continuar.`,
      validar: senhaAssinaturaCorreta,
      onSucesso: () => {
        liberarAssinaturasProtegidas();
        renderEmpresa();
        acao();
      },
    });
    return false;
  };

  const visualizarDocumento = () => {
    if (!validarCamposObrigatorios()) return;
    const estadoAtual = montarEstadoParaExportacao();
    el.previewBody.innerHTML = buildPdfDocHTML(estadoAtual);
    abrirModal('modalPreview');
  };

  const imprimirDocumento = () => {
    if (!validarCamposObrigatorios()) return;
    const estadoAtual = montarEstadoParaExportacao();

    let printArea = document.querySelector('.print-area');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.className = 'print-area';
      document.body.appendChild(printArea);
    }
    printArea.innerHTML = buildPdfDocHTML(estadoAtual);
    window.print();
  };

  document.getElementById('btnPreview').addEventListener('click', () => {
    if (exigirAssinaturaLiberada(visualizarDocumento)) visualizarDocumento();
  });

  document.getElementById('btnImprimir').addEventListener('click', () => {
    if (exigirAssinaturaLiberada(imprimirDocumento)) imprimirDocumento();
  });

  /* -------------------------------------------------------
     EVENTOS: TIPO DE ORÇAMENTO
     ------------------------------------------------------- */
  el.typeToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-toggle__btn');
    if (!btn) return;
    const novoTipo = btn.dataset.tipo;
    if (novoTipo === state.tipo) return;

    state.tipo = novoTipo;
    renderTipo();
    persistirRascunho();
  });

  /* -------------------------------------------------------
     EVENTOS: CAMPOS DE TELEFONIA
     ------------------------------------------------------- */
  [el.telSituacaoAtual, el.telSolucaoTexto, el.telObservacaoComodato,
    el.telConsideracoesFinais, el.telObservacaoFinal].forEach((textarea) => {
    textarea.addEventListener('input', () => persistirRascunhoDebounced());
  });

  el.telPrazoPortabilidade.addEventListener('input', () => {
    el.telPrazoPortabilidade.value = el.telPrazoPortabilidade.value.replace(/\D/g, '');
    persistirRascunhoDebounced();
  });

  el.telManutencaoPabx.addEventListener('change', () => persistirRascunho());

  [el.declTitulo, el.declReferencia, el.declDocumentoRelacionado,
    el.declLocal, el.declDataTexto].forEach((input) => {
    input.addEventListener('input', () => {
      setFieldValidity(input, true);
      persistirRascunhoDebounced();
    });
  });
  let declSelectionRange = null;
  const salvarSelecaoDeclaracao = () => {
    const selecao = window.getSelection();
    if (!selecao || !selecao.rangeCount || !el.declCorpoEditor.contains(selecao.anchorNode)) return;
    // Não substitui uma seleção válida quando o foco passa para a barra de
    // ferramentas e o navegador temporariamente colapsa a seleção.
    if (!selecao.isCollapsed) declSelectionRange = selecao.getRangeAt(0).cloneRange();
  };
  const restaurarSelecaoDeclaracao = () => {
    if (!declSelectionRange) return false;
    el.declCorpoEditor.focus();
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(declSelectionRange);
    return true;
  };
  const sincronizarDeclaracaoEditor = () => {
    state.declaracao.corpo = el.declCorpoEditor.innerText.trim();
    state.declaracao.corpoHtml = sanitizeRichTextHTML(el.declCorpoEditor.innerHTML);
    el.declCorpo.value = state.declaracao.corpo;
    persistirRascunhoDebounced();
  };
  ['keyup', 'mouseup', 'touchend'].forEach((evento) => {
    el.declCorpoEditor.addEventListener(evento, salvarSelecaoDeclaracao);
  });
  document.addEventListener('selectionchange', salvarSelecaoDeclaracao);
  el.declCorpoEditor.addEventListener('input', sincronizarDeclaracaoEditor);
  document.querySelectorAll('[data-decl-command="bold"]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      el.declCorpoEditor.focus();
      restaurarSelecaoDeclaracao();
      document.execCommand('bold');
      sincronizarDeclaracaoEditor();
    });
  });
  el.declFontSize.addEventListener('mousedown', salvarSelecaoDeclaracao);
  el.declFontSize.addEventListener('change', () => {
    if (!restaurarSelecaoDeclaracao() || declSelectionRange.collapsed) return;
    const selecao = window.getSelection();
    const range = selecao.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = `${el.declFontSize.value}px`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selecao.removeAllRanges();
    const novoRange = document.createRange();
    novoRange.selectNodeContents(span);
    selecao.addRange(novoRange);
    declSelectionRange = novoRange.cloneRange();
    sincronizarDeclaracaoEditor();
  });
  el.declMostrarCliente.addEventListener('change', () => persistirRascunho());

  el.btnAddRealizacao.addEventListener('click', () => {
    state.telefonia.realizacoes.push('');
    renderEditableList(el.telRealizacoesList, state.telefonia.realizacoes, 'Ex.: Portabilidade de 4 linhas telefônicas para a {empresa}');
    el.telRealizacoesList.querySelector('.editable-list__row:last-child input')?.focus();
    persistirRascunho();
  });

  el.btnAddBeneficio.addEventListener('click', () => {
    state.telefonia.beneficios.push('');
    renderEditableList(el.telBeneficiosList, state.telefonia.beneficios, 'Ex.: Suporte técnico especializado');
    el.telBeneficiosList.querySelector('.editable-list__row:last-child input')?.focus();
    persistirRascunho();
  });

  bindEditableList(el.telRealizacoesList, () => state.telefonia.realizacoes, persistirRascunhoDebounced, 'Ex.: Portabilidade de 4 linhas telefônicas para a {empresa}');
  bindEditableList(el.telBeneficiosList, () => state.telefonia.beneficios, persistirRascunhoDebounced, 'Ex.: Suporte técnico especializado');

  /* -------------------------------------------------------
     EVENTOS: SELEÇÃO DE EMPRESA
     ------------------------------------------------------- */
  el.companySelector.addEventListener('change', (e) => {
    const option = e.target.closest('.company-option');
    if (!option) return;
    state.empresaId = option.dataset.empresa;
    state.emitente = {};
    renderEmpresa();
    persistirRascunho();
  });

  /* -------------------------------------------------------
     EVENTOS: SELEÇÃO DE RESPONSÁVEL COMERCIAL
     ------------------------------------------------------- */
  /* Modal de senha reutilizável: cada uso informa como validar e o que fazer ao acertar. */
  let senhaContexto = null;
  const pedirSenha = ({ texto, validar, onSucesso }) => {
    senhaContexto = { validar, onSucesso };
    el.senhaTexto.textContent = texto;
    el.senhaResponsavel.value = '';
    el.senhaErro.hidden = true;
    abrirModal('modalSenha');
    setTimeout(() => el.senhaResponsavel.focus(), 50);
  };

  const confirmarSenha = () => {
    if (!senhaContexto) return;
    if (senhaContexto.validar(el.senhaResponsavel.value.trim())) {
      const { onSucesso } = senhaContexto;
      senhaContexto = null;
      fecharModais();
      onSucesso();
    } else {
      el.senhaErro.hidden = false;
      el.senhaResponsavel.value = '';
      el.senhaResponsavel.focus();
    }
  };
  document.getElementById('confirmSenha').addEventListener('click', confirmarSenha);
  el.senhaResponsavel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmarSenha(); }
  });

  /** Libera as assinaturas protegidas nesta sessão (vale para todos os responsáveis protegidos). */
  const liberarAssinaturasProtegidas = () => {
    assinaturasProtegidas.liberadas = true;
  };

  el.responsavelSelector.addEventListener('change', (e) => {
    const option = e.target.closest('.responsavel-option');
    if (!option) return;

    // Opção editável: exige senha antes de liberar
    if (option.dataset.responsavel === RESPONSAVEL_PERSONALIZADO_ID && !responsavelDesbloqueado) {
      renderEmpresa(); // desfaz a seleção visual
      pedirSenha({
        texto: 'Digite a senha para usar esta opção.',
        validar: senhaCorreta,
        onSucesso: () => {
          responsavelDesbloqueado = true;
          state.responsavelId = RESPONSAVEL_PERSONALIZADO_ID;
          renderEmpresa();
          persistirRascunho();
          el.responsavelNome.focus();
        },
      });
      return;
    }

    // Assinatura protegida (ex.: supervisores): exige a senha antes de selecionar
    const empresa = getEmpresaDocumento(state);
    const escolhido = empresa.responsaveis.find((r) => r.id === option.dataset.responsavel);
    if (escolhido && assinaturaBloqueada(escolhido)) {
      renderEmpresa(); // desfaz a seleção visual
      pedirSenha({
        texto: `A assinatura de ${escolhido.nome} é protegida. Digite a senha para usá-la.`,
        validar: senhaAssinaturaCorreta,
        onSucesso: () => {
          liberarAssinaturasProtegidas();
          state.responsavelId = escolhido.id;
          renderEmpresa();
          persistirRascunho();
        },
      });
      return;
    }

    state.responsavelId = option.dataset.responsavel;
    renderEmpresa();
    persistirRascunho();
  });

  [el.responsavelNome, el.responsavelCargo].forEach((input) => {
    input.addEventListener('input', () => {
      state.responsavelPersonalizado = {
        nome: el.responsavelNome.value,
        cargo: el.responsavelCargo.value,
      };
      renderAssinatura();
      persistirRascunhoDebounced();
    });
  });

  camposEmitente.forEach((campo) => {
    const input = el[`emitente${campo[0].toUpperCase()}${campo.slice(1)}`];
    input?.addEventListener('input', () => {
      state.emitente = state.emitente || {};
      state.emitente[campo] = input.value;
      persistirRascunhoDebounced();
    });
  });
  el.btnRestaurarEmitente.addEventListener('click', () => {
    state.emitente = {};
    renderEmpresa();
    persistirRascunho();
    mostrarToast('Dados do emitente restaurados.', 'info');
  });

  /* -------------------------------------------------------
     EVENTOS: DADOS DO CLIENTE (com máscaras)
     ------------------------------------------------------- */
  bindMask(el.clienteTelefone, maskPhone);
  bindMask(el.clienteCep, maskCEP);
  bindMask(el.clienteDocumento, maskCpfCnpj);

  [el.clienteRazaoSocial, el.clienteDocumento, el.clienteTelefone, el.clienteEmail,
    el.clienteCep, el.clienteEndereco, el.clienteNumero, el.clienteComplemento,
    el.clienteBairro, el.clienteCidade].forEach((input) => {
    input.addEventListener('input', () => {
      setFieldValidity(input, true);
      persistirRascunhoDebounced();
    });
  });

  el.data.addEventListener('change', () => { state.data = el.data.value; persistirRascunho(); });
  el.validade.addEventListener('change', () => { state.validade = el.validade.value; persistirRascunho(); });

  /* -------------------------------------------------------
     EVENTOS: TABELA DE ITENS (delegação de eventos)
     ------------------------------------------------------- */
  el.btnAddItem.addEventListener('click', adicionarItem);

  el.itemsTableBody.addEventListener('click', (e) => {
    const btnRemover = e.target.closest('[data-remove-item]');
    if (btnRemover) {
      const tr = btnRemover.closest('tr');
      itemPendenteRemocao = tr.dataset.id;
      abrirModal('modalRemoverItem');
    }
  });

  document.getElementById('confirmRemoverItem').addEventListener('click', () => {
    if (itemPendenteRemocao) removerItem(itemPendenteRemocao);
    itemPendenteRemocao = null;
    fecharModais();
  });

  el.itemsTableBody.addEventListener('input', (e) => {
    const input = e.target;
    const tr = input.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    const campo = input.dataset.field;
    if (!campo) return;

    if (campo === 'descricao') {
      atualizarItemCampo(id, 'descricao', input.value);
      return;
    }

    if (campo === 'quantidade') {
      const cursorPos = input.selectionStart;
      input.value = input.value.replace(/[^\d,.]/g, '');
      input.setSelectionRange(cursorPos, cursorPos);
      atualizarItemCampo(id, 'quantidade', parseCurrency(input.value) || 0);
      return;
    }

    if (campo === 'valorUnitario') {
      const cursorFromEnd = input.value.length - input.selectionStart;
      input.value = maskCurrencyInput(input.value);
      const pos = input.value.length - cursorFromEnd;
      input.setSelectionRange(pos, pos);
      atualizarItemCampo(id, 'valorUnitario', parseCurrency(input.value) || 0);
    }
  });

  /* -------------------------------------------------------
     EVENTOS: DESCONTO
     ------------------------------------------------------- */
  document.querySelectorAll('.discount-toggle__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.discount-toggle__btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.desconto.tipo = btn.dataset.tipo;
      el.descontoValor.value = '';
      state.desconto.valor = 0;
      atualizarTotais();
      persistirRascunho();
    });
  });

  el.descontoValor.addEventListener('input', () => {
    if (state.desconto.tipo === 'percentual') {
      let v = el.descontoValor.value.replace(/[^\d,]/g, '');
      el.descontoValor.value = v;
      state.desconto.valor = Math.min(parseCurrency(v) || 0, 100);
    } else {
      const cursorFromEnd = el.descontoValor.value.length - el.descontoValor.selectionStart;
      el.descontoValor.value = maskCurrencyInput(el.descontoValor.value);
      const pos = el.descontoValor.value.length - cursorFromEnd;
      el.descontoValor.setSelectionRange(pos, pos);
      state.desconto.valor = parseCurrency(el.descontoValor.value) || 0;
    }
    atualizarTotais();
    persistirRascunhoDebounced();
  });

  /* -------------------------------------------------------
     EVENTOS: OBSERVAÇÕES / CONDIÇÕES
     ------------------------------------------------------- */
  el.observacoes.addEventListener('input', () => {
    state.observacoes = el.observacoes.value;
    persistirRascunhoDebounced();
  });
  el.condicoes.addEventListener('input', () => {
    state.condicoes = el.condicoes.value;
    persistirRascunhoDebounced();
  });

  /* -------------------------------------------------------
     EVENTOS: MODAIS (fechar)
     ------------------------------------------------------- */
  el.modalOverlay.addEventListener('click', (e) => {
    if (e.target === el.modalOverlay) fecharModais();
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', fecharModais);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModais();
  });

  /* -------------------------------------------------------
     INICIALIZAÇÃO
     ------------------------------------------------------- */
  const inicializar = () => {
    el.anoAtual.textContent = new Date().getFullYear();

    const draft = loadDraft();
    if (draft && draft.numero) {
      abrirModal('modalCarregar');
      // Enquanto o usuário decide, já prepara um orçamento novo por baixo
      state.numero = getNextOrcamentoNumber();
      aplicarEstadoAoDOM();
    } else {
      state.numero = getNextOrcamentoNumber();
      aplicarEstadoAoDOM();
    }
  };

  document.addEventListener('DOMContentLoaded', inicializar);
})();
