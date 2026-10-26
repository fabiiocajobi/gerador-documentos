/* =========================================================
   pdf.js
   Responsável por montar o HTML do documento (usado tanto
   no preview quanto na impressão via navegador).

   Existem dois templates de documento:
   - buildPdfDocHTMLPadrao: orçamento genérico (produtos/serviços)
   - buildPdfDocHTMLTelefonia: proposta comercial de telefonia fixa
   O template usado é escolhido conforme state.tipo ('padrao' | 'telefonia').
   Ambos herdam a cor de destaque (--doc-accent) da empresa selecionada,
   então o documento se adapta visualmente à empresa emissora.
   ========================================================= */

/** Monta o atributo style com as variáveis de cor da empresa para o documento */
const corDocumentoStyle = (empresa) => {
  const cor = empresa.corDocumento || { principal: '#1B8A4B', escura: '#106236' };
  return `--doc-accent:${cor.principal}; --doc-accent-dark:${cor.escura};`;
};

/** Cabeçalho do documento — compartilhado pelos templates, com variação para declarações */
const pdfHeaderHTML = (empresa, numero, data, validade, options = {}) => `
  <div class="pdf-doc__header">
    <img class="pdf-doc__logo" src="${empresa.logo}" alt="${escapeHTML(empresa.nomeFantasia)}">
    <div class="pdf-doc__header-right">
      ${options.declaracao
        ? `<div class="pdf-doc__doc-number pdf-doc__doc-number--declaracao"><span>DOCUMENTO</span><strong>Nº ${escapeHTML(String(numero || '').replace(/^ORC-/, ''))}</strong></div>`
        : `<div class="pdf-doc__doc-number">${escapeHTML(numero)}</div>`}
      <div class="pdf-doc__dates">
        Data: ${formatDateBR(data)}${options.declaracao ? '' : `<br>Válido até: ${formatDateBR(validade)}`}
      </div>
    </div>
  </div>
`;

/**
 * Bloco de assinatura — compartilhado pelos templates.
 * Se o responsável é protegido por senha e ainda não foi liberado, a imagem
 * da assinatura não é incluída no documento.
 */
const pdfSignatureHTML = (empresa, responsavel) => {
  const imagem = assinaturaBloqueada(responsavel)
    ? '<span class="pdf-doc__signature-fallback" style="display:flex">assinatura protegida</span>'
    : `<img src="${responsavel.assinatura}" alt="Assinatura de ${escapeHTML(responsavel.nome)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
    <span class="pdf-doc__signature-fallback">assinatura pendente</span>`;
  return `
  <div class="pdf-doc__signature avoid-break">
    ${imagem}
    <div class="pdf-doc__signature-info">
      <b>${escapeHTML(responsavel.nome)}</b>
      <span>${escapeHTML(responsavel.cargo)}</span>
      <span>${escapeHTML(empresa.nomeFantasia)}</span>
    </div>
  </div>
`;
};

/**
 * Monta o markup HTML completo do orçamento padrão (produtos/serviços)
 * no formato de documento A4, pronto para impressão, preview ou exportação.
 * @param {object} state - estado completo do orçamento
 * @returns {string} HTML
 */
const buildPdfDocHTMLPadrao = (state) => {
  const empresa = getEmpresaDocumento(state);
  const responsavel = getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado);
  const { cliente, itens, desconto, observacoes, condicoes, numero, data, validade } = state;

  const linhasItens = itens.map((item, index) => `
    <tr class="avoid-break">
      <td class="center">${index + 1}</td>
      <td>${escapeHTML(item.descricao || '—')}</td>
      <td class="num">${formatQuantidade(item.quantidade)}</td>
      <td class="num">${formatCurrency(item.valorUnitario)}</td>
      <td class="num">${formatCurrency(item.quantidade * item.valorUnitario)}</td>
    </tr>
  `).join('');

  const subtotalGeral = calcularSubtotal(itens);
  const valorDesconto = calcularValorDesconto(subtotalGeral, desconto);
  const valorFinal = Math.max(subtotalGeral - valorDesconto, 0);

  return `
    <div class="pdf-doc" style="${corDocumentoStyle(empresa)}">
      ${pdfHeaderHTML(empresa, numero, data, validade)}

      <h1 class="pdf-doc__title">Orçamento para Prestação de Serviços e Produtos de Telecomunicações</h1>

      <div class="pdf-doc__grid">
        <div class="pdf-doc__info-block">
          <div class="pdf-doc__section-title">Empresa emissora</div>
          <b>${escapeHTML(empresa.razaoSocial)}</b><br>
          <span class="muted">${escapeHTML(empresa.nomeFantasia)}</span><br>
          CNPJ: ${escapeHTML(empresa.cnpj)}<br>
          ${escapeHTML(empresa.endereco)} — ${escapeHTML(empresa.bairro)}, ${escapeHTML(cidadeUF(empresa))}<br>
          CEP: ${escapeHTML(empresa.cep)}<br>
          Tel: ${escapeHTML(empresa.telefone)}${empresa.email ? ' · ' + escapeHTML(empresa.email) : ''}
        </div>
        <div class="pdf-doc__info-block">
          <div class="pdf-doc__section-title">Cliente</div>
          <b>${escapeHTML(cliente.razaoSocial || '—')}</b><br>
          CPF/CNPJ: ${escapeHTML(cliente.documento || '—')}<br>
          ${escapeHTML(cliente.endereco || '—')}${cliente.numero ? ', ' + escapeHTML(cliente.numero) : ''} ${cliente.complemento ? '- ' + escapeHTML(cliente.complemento) : ''}<br>
          ${escapeHTML(cliente.bairro || '—')}, ${escapeHTML(cliente.cidade || '—')} — CEP: ${escapeHTML(cliente.cep || '—')}<br>
          Tel: ${escapeHTML(cliente.telefone || '—')} ${cliente.email ? '· ' + escapeHTML(cliente.email) : ''}
        </div>
      </div>

      <div class="pdf-doc__section-title">Produtos e serviços</div>
      <table class="pdf-items">
        <thead>
          <tr>
            <th style="width:32px;">Item</th>
            <th>Descrição</th>
            <th style="width:60px; text-align:right;">Qtd.</th>
            <th style="width:90px; text-align:right;">Valor unit.</th>
            <th style="width:90px; text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linhasItens || '<tr><td colspan="5" class="center muted">Nenhum item adicionado</td></tr>'}
        </tbody>
      </table>

      <div class="pdf-doc__totals">
        <div class="pdf-doc__totals-box">
          <div class="pdf-doc__totals-row">
            <span>Subtotal</span><span>${formatCurrency(subtotalGeral)}</span>
          </div>
          <div class="pdf-doc__totals-row discount">
            <span>Desconto</span><span>- ${formatCurrency(valorDesconto)}</span>
          </div>
          <div class="pdf-doc__totals-row final">
            <span>Valor final</span><span>${formatCurrency(valorFinal)}</span>
          </div>
        </div>
      </div>

      ${observacoes ? `
        <div class="pdf-doc__section-title">Observações</div>
        <div class="pdf-doc__text-block">${escapeHTML(observacoes)}</div>
      ` : ''}

      <div class="pdf-doc__section-title">Condições comerciais</div>
      <div class="pdf-doc__text-block">${escapeHTML(condicoes)}</div>

      ${pdfSignatureHTML(empresa, responsavel)}
    </div>
  `;
};

/** Substitui placeholders {empresa}, {prazo} e {pabx} pelo valor correspondente do contexto */
const applyPlaceholders = (texto, ctx) => {
  if (!texto) return '';
  return texto.replace(/\{(\w+)\}/g, (match, chave) => (ctx[chave] !== undefined ? ctx[chave] : match));
};

/**
 * Monta o markup HTML da proposta comercial de telefonia fixa,
 * no mesmo padrão de documento A4 (preview, impressão ou PDF).
 * @param {object} state - estado completo do orçamento
 * @returns {string} HTML
 */
const buildPdfDocHTMLTelefonia = (state) => {
  const empresa = getEmpresaDocumento(state);
  const responsavel = getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado);
  const { cliente, itens, desconto, observacoes, condicoes, numero, data, validade } = state;
  const tel = state.telefonia || {};

  const ctx = {
    empresa: empresa.nomeFantasia,
    prazo: `${tel.prazoPortabilidadeHoras || 72} horas`,
    pabx: tel.manutencaoPabx ? 'mantendo a central PABX já existente' : 'com fornecimento de nova central PABX',
  };

  const situacaoAtual = applyPlaceholders(tel.situacaoAtual, ctx);
  const solucaoTexto = applyPlaceholders(tel.solucaoTexto, ctx);
  const consideracoesFinais = applyPlaceholders(tel.consideracoesFinais, ctx);
  const observacaoFinal = applyPlaceholders(tel.observacaoFinal, ctx);
  const observacaoComodato = applyPlaceholders(tel.observacaoComodato, ctx);

  const realizacoes = (tel.realizacoes || [])
    .filter((r) => r && r.trim())
    .map((r) => applyPlaceholders(r, ctx));
  const beneficios = (tel.beneficios || [])
    .filter((b) => b && b.trim())
    .map((b) => applyPlaceholders(b, ctx));

  // Itens com custo mensal entram na tabela de investimento;
  // itens de valor zero (ex.: equipamentos em comodato) são listados à parte.
  const itensComCusto = itens.filter((i) => Number(i.valorUnitario) > 0);
  const itensComodato = itens.filter((i) => !(Number(i.valorUnitario) > 0) && i.descricao);

  const linhasItens = itensComCusto.map((item) => `
    <tr class="avoid-break">
      <td>${escapeHTML(item.descricao || '—')}</td>
      <td class="num">${formatQuantidade(item.quantidade)}</td>
      <td class="num">${formatCurrency(item.valorUnitario)}</td>
      <td class="num">${formatCurrency(item.quantidade * item.valorUnitario)}</td>
    </tr>
  `).join('');

  const subtotalGeral = calcularSubtotal(itens);
  const valorDesconto = calcularValorDesconto(subtotalGeral, desconto);
  const valorFinal = Math.max(subtotalGeral - valorDesconto, 0);

  const diasValidade = diffDaysISO(data, validade);

  return `
    <div class="pdf-doc" style="${corDocumentoStyle(empresa)}">
      ${pdfHeaderHTML(empresa, numero, data, validade)}

      <h1 class="pdf-doc__title-center">Proposta Comercial — Solução de Telefonia</h1>

      <div class="pdf-doc__grid">
        <div class="pdf-doc__info-block">
          <div class="pdf-doc__section-title">Empresa emissora</div>
          <b>${escapeHTML(empresa.razaoSocial)}</b><br>
          <span class="muted">${escapeHTML(empresa.nomeFantasia)}</span><br>
          CNPJ: ${escapeHTML(empresa.cnpj)}<br>
          ${escapeHTML(empresa.endereco)} — ${escapeHTML(empresa.bairro)}, ${escapeHTML(cidadeUF(empresa))}<br>
          CEP: ${escapeHTML(empresa.cep)}<br>
          Tel: ${escapeHTML(empresa.telefone)}${empresa.email ? ' · ' + escapeHTML(empresa.email) : ''}
        </div>
        <div class="pdf-doc__info-block">
          <div class="pdf-doc__section-title">Cliente</div>
          <b>${escapeHTML(cliente.razaoSocial || '—')}</b><br>
          CPF/CNPJ: ${escapeHTML(cliente.documento || '—')}<br>
          ${escapeHTML(cliente.endereco || '—')}${cliente.numero ? ', ' + escapeHTML(cliente.numero) : ''} ${cliente.complemento ? '- ' + escapeHTML(cliente.complemento) : ''}<br>
          ${escapeHTML(cliente.bairro || '—')}, ${escapeHTML(cliente.cidade || '—')} — CEP: ${escapeHTML(cliente.cep || '—')}<br>
          Tel: ${escapeHTML(cliente.telefone || '—')} ${cliente.email ? '· ' + escapeHTML(cliente.email) : ''}
        </div>
      </div>

      ${situacaoAtual ? `
        <div class="pdf-doc__section-title">Situação atual</div>
        <div class="pdf-doc__text-block">${escapeHTML(situacaoAtual)}</div>
      ` : ''}

      ${solucaoTexto ? `<div class="pdf-doc__text-block">${escapeHTML(solucaoTexto)}</div>` : ''}

      ${realizacoes.length ? `
        <div class="pdf-doc__section-title">Solução proposta — o que será realizado</div>
        <ul class="pdf-doc__bullet-list">
          ${realizacoes.map((r) => `<li>${escapeHTML(r)}</li>`).join('')}
        </ul>
      ` : ''}

      ${observacaoComodato ? `
        <div class="pdf-doc__callout"><b>Importante:</b> ${escapeHTML(observacaoComodato)}</div>
      ` : ''}

      <div class="pdf-doc__section-title">Investimento</div>
      <table class="pdf-items">
        <thead>
          <tr>
            <th>Descrição</th>
            <th style="width:60px; text-align:right;">Qtd.</th>
            <th style="width:90px; text-align:right;">Valor unit.</th>
            <th style="width:90px; text-align:right;">Valor mensal</th>
          </tr>
        </thead>
        <tbody>
          ${linhasItens || '<tr><td colspan="4" class="center muted">Nenhum item adicionado</td></tr>'}
        </tbody>
      </table>

      ${itensComodato.length ? `
        <div class="pdf-doc__comodato-note">Equipamentos inclusos em comodato: ${itensComodato.map((i) => escapeHTML(i.descricao)).join('; ')}.</div>
      ` : ''}

      <div class="pdf-doc__totals">
        <div class="pdf-doc__totals-box">
          <div class="pdf-doc__totals-row">
            <span>Subtotal</span><span>${formatCurrency(subtotalGeral)}</span>
          </div>
          <div class="pdf-doc__totals-row discount">
            <span>Desconto</span><span>- ${formatCurrency(valorDesconto)}</span>
          </div>
          <div class="pdf-doc__totals-row final">
            <span>Total mensal</span><span>${formatCurrency(valorFinal)}</span>
          </div>
        </div>
      </div>

      ${beneficios.length ? `
        <div class="pdf-doc__section-title">Benefícios</div>
        <ul class="pdf-doc__check-list">
          ${beneficios.map((b) => `<li>${escapeHTML(b)}</li>`).join('')}
        </ul>
      ` : ''}

      ${consideracoesFinais ? `
        <div class="pdf-doc__section-title">Considerações finais</div>
        <div class="pdf-doc__text-block">${escapeHTML(consideracoesFinais)}</div>
      ` : ''}

      ${observacaoFinal ? `
        <div class="pdf-doc__section-title">Observação</div>
        <div class="pdf-doc__text-block">${escapeHTML(observacaoFinal)}</div>
      ` : ''}

      ${condicoes ? `
        <div class="pdf-doc__section-title">Condições comerciais</div>
        <div class="pdf-doc__text-block">${escapeHTML(condicoes)}</div>
      ` : ''}

      ${observacoes ? `
        <div class="pdf-doc__section-title">Observações adicionais</div>
        <div class="pdf-doc__text-block">${escapeHTML(observacoes)}</div>
      ` : ''}

      <div class="pdf-doc__section-title">Validade da proposta</div>
      <div class="pdf-doc__text-block">Esta proposta possui validade de ${diasValidade > 0 ? `${diasValidade} dias` : '—'} a partir da data de emissão (${formatDateBR(data)}), com vencimento em ${formatDateBR(validade)}.</div>

      ${pdfSignatureHTML(empresa, responsavel)}
    </div>
  `;
};

/**
 * Monta um documento livre em papel timbrado, adequado para declarações,
 * autorizações e comunicados. O corpo preserva as quebras de linha digitadas.
 */
const buildPdfDocHTMLDeclaracao = (state) => {
  const empresa = getEmpresaDocumento(state);
  const responsavel = getResponsavel(empresa, state.responsavelId, state.responsavelPersonalizado);
  const cliente = state.cliente || {};
  const declaracao = state.declaracao || {};
  const dataTexto = declaracao.dataTexto || formatDateBR(state.data);
  const local = declaracao.local || empresa.cidade;
  const clienteNome = cliente.razaoSocial || 'Cliente';
  const mostrarCliente = declaracao.mostrarCliente !== false;

  return `
    <div class="pdf-doc pdf-doc--declaracao" style="${corDocumentoStyle(empresa)}">
      ${pdfHeaderHTML(empresa, state.numero, state.data, state.validade, { declaracao: true })}

      <div class="pdf-doc__declaration-kicker">
        ${declaracao.referencia ? `Declaração vinculada a ${escapeHTML(declaracao.referencia)}` : 'Documento em papel timbrado'}
      </div>
      <h1 class="pdf-doc__declaration-title">${escapeHTML(declaracao.titulo || 'DECLARAÇÃO')}</h1>

      <div class="pdf-doc__declaration-meta">
        <div class="pdf-doc__party">
          <div class="pdf-doc__party-title">EMPRESA EMITENTE</div>
          <b>${escapeHTML(empresa.razaoSocial)}</b><br>
          CNPJ: ${escapeHTML(empresa.cnpj)}<br>
          ${escapeHTML(empresa.endereco)}, ${escapeHTML(empresa.bairro)}<br>
          ${escapeHTML(cidadeUF(empresa))} — ${escapeHTML(empresa.cep)}<br>
          Tel: ${escapeHTML(empresa.telefone)}${empresa.email ? ' · ' + escapeHTML(empresa.email) : ''}
        </div>
        <div class="pdf-doc__party">
          <div class="pdf-doc__party-title">ASSINANTE / DESTINATÁRIO</div>
          <b>${escapeHTML(cliente.razaoSocial || '—')}</b><br>
          CPF/CNPJ: ${escapeHTML(cliente.documento || '—')}<br>
          ${escapeHTML(cliente.endereco || '—')}${cliente.numero ? `, ${escapeHTML(cliente.numero)}` : ''}${cliente.complemento ? ` — ${escapeHTML(cliente.complemento)}` : ''}<br>
          ${escapeHTML(cliente.bairro || '—')}, ${escapeHTML(cliente.cidade || '—')} — ${escapeHTML(cliente.cep || '—')}<br>
          Tel: ${escapeHTML(cliente.telefone || '—')}${cliente.email ? ` · ${escapeHTML(cliente.email)}` : ''}
        </div>
        ${declaracao.documentoRelacionado ? `<div class="pdf-doc__party--related"><b>DOCUMENTO RELACIONADO</b> ${escapeHTML(declaracao.documentoRelacionado)}</div>` : ''}
      </div>

      <div class="pdf-doc__declaration-body">${declaracao.corpoHtml
        ? sanitizeRichTextHTML(declaracao.corpoHtml)
        : negritoCaixaAlta(declaracao.corpo || '')}</div>

      <div class="pdf-doc__declaration-place">${escapeHTML(local)}, ${escapeHTML(dataTexto)}</div>

      <div class="pdf-doc__declaration-signatures ${mostrarCliente ? '' : 'pdf-doc__declaration-signatures--single'}">
        <div class="pdf-doc__declaration-signature">
          <div class="pdf-doc__declaration-spacer"></div>
          <div class="pdf-doc__declaration-line"></div>
          <b>${escapeHTML(empresa.razaoSocial)}</b>
          <span>${escapeHTML(responsavel.nome)} — ${escapeHTML(responsavel.cargo)}</span>
        </div>
        ${mostrarCliente ? `
          <div class="pdf-doc__declaration-signature">
            <div class="pdf-doc__declaration-spacer"></div>
            <div class="pdf-doc__declaration-line"></div>
            <b>${escapeHTML(clienteNome)}</b>
            <span>Cliente${cliente.documento ? ` — ${escapeHTML(cliente.documento)}` : ''}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};

/**
 * Dispatcher: escolhe o template conforme state.tipo.
 * @param {object} state
 * @returns {string} HTML
 */
const buildPdfDocHTML = (state) =>
  state.tipo === 'telefonia'
    ? buildPdfDocHTMLTelefonia(state)
    : state.tipo === 'declaracao'
      ? buildPdfDocHTMLDeclaracao(state)
      : buildPdfDocHTMLPadrao(state);

/** Formata quantidade sem casas decimais desnecessárias */
const formatQuantidade = (qtd) => {
  const n = Number(qtd) || 0;
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};
