/* =========================================================
   storage.js
   Camada de persistência local (LocalStorage).
   Centraliza todas as chaves usadas pelo sistema para
   facilitar manutenção e futura migração para um backend.
   ========================================================= */

const STORAGE_KEYS = {
  DRAFT: 'orcamento:rascunho',
  COUNTER: 'orcamento:contador',
};

/**
 * Salva o rascunho atual do orçamento no LocalStorage.
 * @param {object} data - estado completo do orçamento
 */
const saveDraft = (data) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch (err) {
    console.error('Erro ao salvar rascunho:', err);
    return false;
  }
};

/**
 * Recupera o rascunho salvo, se existir.
 * @returns {object|null}
 */
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Erro ao carregar rascunho:', err);
    return null;
  }
};

/** Remove o rascunho salvo */
const clearDraft = () => {
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
};

/**
 * Retorna o próximo número de orçamento no formato ORC-AAAA-000001
 * e já incrementa o contador salvo no LocalStorage.
 * @returns {string}
 */
const getNextOrcamentoNumber = () => {
  const year = new Date().getFullYear();
  let counterData;

  try {
    counterData = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTER)) || {};
  } catch {
    counterData = {};
  }

  // Reinicia o contador quando o ano muda
  if (counterData.year !== year) {
    counterData = { year, value: 0 };
  }

  counterData.value += 1;
  localStorage.setItem(STORAGE_KEYS.COUNTER, JSON.stringify(counterData));

  const padded = String(counterData.value).padStart(6, '0');
  return `ORC-${year}-${padded}`;
};

/**
 * Retorna o número de orçamento atual sem incrementar o contador
 * (útil para reexibir o mesmo número ao carregar um rascunho).
 * @returns {string|null}
 */
const peekCurrentOrcamentoNumber = () => {
  try {
    const counterData = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTER));
    if (!counterData) return null;
    const padded = String(counterData.value).padStart(6, '0');
    return `ORC-${counterData.year}-${padded}`;
  } catch {
    return null;
  }
};
