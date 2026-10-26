/* =========================================================
   utils.js
   Funções utilitárias puras e reutilizáveis: formatação,
   máscaras, validação e helpers genéricos.
   Nenhuma função aqui manipula o DOM diretamente (exceto
   os "binders" de máscara, que são utilidades de input).
   ========================================================= */

/**
 * Formata um número para moeda brasileira (R$ 0.000,00)
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) => {
  const number = Number.isFinite(value) ? value : 0;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Converte uma string monetária/numérica em pt-BR (ex: "1.234,56")
 * para um Number JS (1234.56).
 * @param {string} str
 * @returns {number}
 */
const parseCurrency = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '') // remove separador de milhar
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Gera um ID único simples baseado em timestamp + random.
 * @returns {string}
 */
const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Debounce genérico.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Formata uma data ISO (YYYY-MM-DD) para pt-BR (DD/MM/YYYY).
 * @param {string} isoDate
 * @returns {string}
 */
const formatDateBR = (isoDate) => {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
};

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD), usado
 * como value padrão em inputs type="date".
 * @returns {string}
 */
const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

/**
 * Soma dias a uma data ISO e retorna nova data ISO.
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
const addDaysISO = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

/**
 * Retorna a diferença em dias inteiros entre duas datas ISO (fim - início).
 * @param {string} isoStart
 * @param {string} isoEnd
 * @returns {number}
 */
const diffDaysISO = (isoStart, isoEnd) => {
  if (!isoStart || !isoEnd) return 0;
  const start = new Date(`${isoStart}T00:00:00`);
  const end = new Date(`${isoEnd}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)), 0);
};

/**
 * Retorna as iniciais (até 2 letras) de um nome completo, em maiúsculas.
 * @param {string} nome
 * @returns {string}
 */
const iniciais = (nome) => {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
};

/* ---------------------------------------------------------
   MÁSCARAS DE INPUT
   --------------------------------------------------------- */

/** Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000 */
const maskPhone = (value) => {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 5) {
    v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  } else if (v.length > 0) {
    v = v.replace(/(\d{0,2})/, '($1');
  }
  return v.trim();
};

/** Aplica máscara de CEP: 00000-000 */
const maskCEP = (value) => {
  let v = value.replace(/\D/g, '').slice(0, 8);
  v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  return v.replace(/-$/, '');
};

/** Aplica máscara de CPF ou CNPJ automaticamente conforme o tamanho */
const maskCpfCnpj = (value) => {
  let v = value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    // CPF: 000.000.000-00
    v = v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    v = v
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  return v;
};

/** Aplica máscara monetária simples (0.000,00) enquanto digita */
const maskCurrencyInput = (value) => {
  let v = value.replace(/\D/g, '');
  if (!v) return '';
  v = (parseInt(v, 10) / 100).toFixed(2);
  const [intPart, decPart] = v.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intFormatted},${decPart}`;
};

/**
 * Liga um listener de máscara a um input, preservando a posição
 * do cursor no final (comportamento simples e previsível).
 * @param {HTMLInputElement} input
 * @param {Function} maskFn
 */
const bindMask = (input, maskFn) => {
  if (!input) return;
  input.addEventListener('input', (e) => {
    const cursorFromEnd = e.target.value.length - e.target.selectionStart;
    e.target.value = maskFn(e.target.value);
    const newPos = e.target.value.length - cursorFromEnd;
    e.target.setSelectionRange(newPos, newPos);
  });
};

/* ---------------------------------------------------------
   VALIDAÇÃO
   --------------------------------------------------------- */

/** Marca/desmarca um campo como inválido visualmente */
const setFieldValidity = (input, isValid) => {
  if (!input) return;
  input.classList.toggle('is-invalid', !isValid);
};

/** Valida um e-mail simples */
const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Escapa HTML para uso seguro em template strings inseridas via innerHTML */
const escapeHTML = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Limita o HTML produzido pelo editor rico da declaração a formatações
 * necessárias para o documento. Remove scripts, links, atributos e estilos
 * que não sejam tamanho de fonte.
 */
const sanitizeRichTextHTML = (html = '') => {
  const template = document.createElement('template');
  template.innerHTML = String(html);
  const allowed = new Set(['B', 'STRONG', 'BR', 'DIV', 'P', 'SPAN']);
  const sizes = new Set(['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px']);

  const visit = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        visit(child);
        if (!allowed.has(child.tagName)) {
          child.replaceWith(...child.childNodes);
          return;
        }
        const size = child.tagName === 'SPAN' ? String(child.style.fontSize || '').toLowerCase() : '';
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
        if (child.tagName === 'SPAN') {
          if (sizes.has(size)) child.style.fontSize = size;
        }
      }
    });
  };

  visit(template.content);
  return template.innerHTML;
};

/**
 * Converte um texto livre em HTML seguro, deixando em negrito as palavras
 * escritas em CAIXA ALTA (ex.: CONTRATANTE, PRESTADORA, CNPJ).
 *
 * Regras:
 * - Palavra em caixa alta = ao menos 2 letras e nenhuma minúscula (aceita acentos).
 * - Frases inteiras em caixa alta viram um único trecho em negrito, inclusive
 *   com conectores no meio: letra solta (A, E, O), números e símbolos como - & /
 *   (ex.: "CONTRATO DE PRESTAÇÃO E SERVIÇOS" ou "CPF/CNPJ").
 * - Trechos em caixa alta não atravessam quebras de linha.
 * - Todo o texto é escapado, então é seguro inserir o resultado em innerHTML.
 * @param {string} texto
 * @returns {string} HTML
 */
const negritoCaixaAlta = (texto = '') => {
  const str = String(texto);
  const reGap = /^(?:[ \t]+|[ \t]*[-–—&/][ \t]*)$/;

  const letrasComCaixa = (w) => Array.from(w).filter((c) => c.toLowerCase() !== c.toUpperCase());
  const ehCaixaAlta = (w) => {
    const letras = letrasComCaixa(w);
    return letras.length >= 2 && letras.every((c) => c === c.toUpperCase());
  };
  const ehConector = (w) => {
    if (/^\p{N}+$/u.test(w)) return true;
    const letras = letrasComCaixa(w);
    return w.length === 1 && letras.length === 1 && letras[0] === letras[0].toUpperCase();
  };

  const palavras = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m;
  while ((m = re.exec(str)) !== null) {
    palavras.push({ texto: m[0], ini: m.index, fim: m.index + m[0].length });
  }

  const gapOk = (a, b) => reGap.test(str.slice(palavras[a].fim, palavras[b].ini));

  // Monta os trechos [inicio, fim) que devem ficar em negrito
  const trechos = [];
  let i = 0;
  while (i < palavras.length) {
    if (!ehCaixaAlta(palavras[i].texto)) { i += 1; continue; }
    let fim = i;
    for (;;) {
      let j = fim + 1;
      while (j < palavras.length && ehConector(palavras[j].texto) && !ehCaixaAlta(palavras[j].texto)) j += 1;
      if (j >= palavras.length || !ehCaixaAlta(palavras[j].texto)) break;
      let ok = true;
      for (let k = fim; k < j; k += 1) if (!gapOk(k, k + 1)) { ok = false; break; }
      if (!ok) break;
      fim = j;
    }
    trechos.push([palavras[i].ini, palavras[fim].fim]);
    i = fim + 1;
  }

  let html = '';
  let cursor = 0;
  trechos.forEach(([ini, fim]) => {
    html += escapeHTML(str.slice(cursor, ini));
    html += `<b>${escapeHTML(str.slice(ini, fim))}</b>`;
    cursor = fim;
  });
  html += escapeHTML(str.slice(cursor));
  return html;
};

/* ---------------------------------------------------------
   HASH DE SENHA (SHA-256 em JS puro, síncrono)
   Usado para proteger assinaturas sem guardar a senha em texto.
   Funciona também quando o index.html é aberto direto do disco
   (file://), onde crypto.subtle pode não estar disponível.
   --------------------------------------------------------- */
const sha256Hex = (message) => {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  const data = new TextEncoder().encode(message);
  const bitLen = data.length * 8;
  const paddedLen = (((data.length + 9 + 63) >> 6) << 6);
  const bytes = new Uint8Array(paddedLen);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 4294967296), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((n) => n.toString(16).padStart(8, '0')).join('');
};

/**
 * Deriva o hash de uma senha: SHA-256 salgado e repetido várias vezes,
 * o que encarece tentativas de adivinhação por força bruta.
 * @param {string} senha
 * @param {string} salt
 * @param {number} iteracoes
 * @returns {string} hash em hexadecimal
 */
const derivarHashSenha = (senha, salt, iteracoes) => {
  let hash = sha256Hex(`${salt}|${senha}`);
  for (let i = 1; i < iteracoes; i += 1) hash = sha256Hex(`${hash}|${salt}`);
  return hash;
};
