/* =========================================================
   empresas.js
   Base de dados das empresas emissoras de orçamento.
   Para adicionar uma nova empresa no futuro, basta incluir
   uma nova chave neste objeto — nenhuma outra parte do
   sistema precisa ser alterada.

   ATENÇÃO: os dados cadastrais abaixo (CNPJ, endereço,
   telefone, responsável) são valores de exemplo/placeholder.
   Substitua pelos dados reais de cada empresa antes de usar
   em produção.
   ========================================================= */

/** Id da opção de responsável editável (liberada somente com senha). */
const RESPONSAVEL_PERSONALIZADO_ID = 'personalizado';

/* ---------------------------------------------------------
   ASSINATURAS PROTEGIDAS POR SENHA
   Responsáveis com `protegido: true` só podem ser usados (e seus
   documentos visualizados/impressos) depois de informar a senha.
   A senha NÃO fica salva aqui — apenas o hash salgado dela.
   O desbloqueio vale só para a sessão atual da página: ao recarregar,
   a assinatura volta a ficar protegida.
   --------------------------------------------------------- */
const ASSINATURA_SENHA_SALT = 'nitro-ass-2026-k7Qp';
const ASSINATURA_SENHA_ITERACOES = 5000;
const ASSINATURA_SENHA_HASH = 'c238c93a4cab41652869ac8ac289e9cad5a70d2e499eaae4d138c34bd9d09bb7';

const assinaturasProtegidas = { liberadas: false };

/** Confere se a senha informada libera as assinaturas protegidas. */
const senhaAssinaturaCorreta = (senha) =>
  derivarHashSenha(String(senha), ASSINATURA_SENHA_SALT, ASSINATURA_SENHA_ITERACOES) === ASSINATURA_SENHA_HASH;

/** true quando o responsável é protegido e a senha ainda não foi informada nesta sessão. */
const assinaturaBloqueada = (responsavel) =>
  Boolean(responsavel && responsavel.protegido) && !assinaturasProtegidas.liberadas;

const empresas = {

  maisvia: {
    id: 'maisvia',
    nomeFantasia: '+Vi@ Fibra',
    razaoSocial: 'Mais Via Fibra Internet Banda Larga Ltda',
    slogan: 'Conectando você ao mundo!',
    cnpj: '08.949.388/0001-83',
    cidade: 'Olímpia',
    bairro: 'Centro',
    endereco: 'Av. Aurora Forti Neves, 278',
    cep: '15405-002',
    telefone: '(17) 3279-2200',
    email: 'comercial@maisviafibra.com.br',
    logo: 'assets/logos/logo_maisvia.png',
    // Responsáveis comerciais disponíveis para assinar orçamentos desta empresa.
    // O primeiro da lista é selecionado por padrão ao criar um novo orçamento.
    responsaveis: [
      {
        id: 'fabio-castro',
        nome: 'Fabio Castro',
        cargo: 'Supervisor de Vendas',
        protegido: true, // exige senha para usar a assinatura
        assinatura: 'assets/assinaturas/ass_maisvia.png',
      },
      {
        id: 'rafaela-menegueti',
        nome: 'Rafaela Menegueti',
        cargo: 'Supervisora de Vendas',
        assinatura: 'assets/assinaturas/ass_maisvia_rafaela.png',
      },
    ],
    corPrimaria: '#1B3A8C',
    // Cores usadas nos documentos (PDF/preview/impressão). Ajuste aqui para
    // trocar o "tema" do documento gerado para esta empresa.
    corDocumento: {
      principal: '#2547B0',
      escura: '#152C70',
    },
  },

  newnitro: {
    id: 'newnitro',
    nomeFantasia: 'Nitro New',
    razaoSocial: 'NEW FIBRA TELECOM - INTERNET FIBRA OPTICA LTDA',
    slogan: 'Internet de verdade.',
    cnpj: '32.574.695/0001-01',
    cidade: 'Olímpia',
    bairro: 'Centro',
    endereco: 'AV. Waldemar Lopes Ferraz, 545',
    cep: '15400-021',
    telefone: '(17) 3279-9020',
    email: 'comercial@nitronew.com.br',
    logo: 'assets/logos/logo_newnitro.png',
    responsaveis: [
      {
        id: 'fabio-silva',
        nome: 'Fabio Silva',
        cargo: 'Supervisor de Vendas',
        protegido: true, // exige senha para usar a assinatura
        assinatura: 'assets/assinaturas/ass_newnitro.png',
      },
      {
        id: 'rafaela-menegueti',
        nome: 'Rafaela Menegueti',
        cargo: 'Supervisora de Vendas',
        assinatura: 'assets/assinaturas/ass_newnitro_rafaela.png',
      },
    ],
    corPrimaria: '#5CB82E',
    corDocumento: {
      principal: '#1B8A4B',
      escura: '#106236',
    },
  },

  direct: {
    id: 'direct',
    nomeFantasia: 'DIRECT',
    razaoSocial: 'GUEDES & LOPES COMUNICACAO E INFORMATICA LTDA',
    slogan: '',
    cnpj: '10.977.573/0001-23',
    cidade: 'Guaíra',
    uf: 'SP',
    bairro: 'Centro',
    endereco: 'Rua 14, 467',
    cep: '14790-000',
    telefone: '(17) 3331-9926',
    email: '', // não informado — é omitido automaticamente nos documentos
    logo: 'assets/logos/logo_direct.png',
    responsaveis: [
      {
        id: 'fabio-silva',
        nome: 'Fabio Silva',
        cargo: 'Supervisor de Vendas',
        protegido: true, // exige senha para usar a assinatura
        assinatura: 'assets/assinaturas/ass_direct.png',
      },
    ],
    corPrimaria: '#0A66D9',
    corDocumento: {
      principal: '#0A66D9',
      escura: '#0A3F91',
    },
  },

};

/**
 * Retorna os dados de uma empresa pelo id, com fallback seguro.
 * @param {string} id
 * @returns {object}
 */
const getEmpresa = (id) => empresas[id] || empresas.newnitro;

/**
 * Retorna a empresa como deve aparecer neste orçamento.
 * As alterações manuais ficam no estado do documento e não modificam o
 * cadastro-base nem afetam outros orçamentos.
 */
const getEmpresaDocumento = (state) => ({
  ...getEmpresa(state?.empresaId),
  ...(state?.emitente || {}),
});

/**
 * Retorna o responsável comercial de uma empresa pelo id do responsável,
 * com fallback para o primeiro responsável cadastrado.
 * @param {object} empresa
 * @param {string} responsavelId
 * @returns {object}
 */
const getResponsavel = (empresa, responsavelId, personalizado) => {
  if (responsavelId === RESPONSAVEL_PERSONALIZADO_ID) {
    const p = personalizado || {};
    return {
      id: RESPONSAVEL_PERSONALIZADO_ID,
      nome: (p.nome || '').trim() || 'Nome do responsável',
      cargo: (p.cargo || '').trim() || 'Cargo',
      assinatura: 'assets/assinaturas/ass_personalizado.png',
    };
  }
  return empresa.responsaveis.find((r) => r.id === responsavelId) || empresa.responsaveis[0];
};


/** Cidade com UF, quando cadastrada (ex.: "Guaíra - SP") */
const cidadeUF = (empresa) => (empresa.uf ? `${empresa.cidade} - ${empresa.uf}` : empresa.cidade);
