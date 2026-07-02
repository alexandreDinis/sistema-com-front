export interface Faturamento {
    id: number;
    dataFaturamento: string;
    valor: number;
    dataCriacao: string;
}

export interface FaturamentoRequest {
    dataFaturamento: string;
    valor: number;
}

export interface PagamentoAdiantado {
    id: number;
    dataPagamento: string;
    valor: number;
    descricao?: string;
    dataCriacao: string;
}

export interface AdiantamentoRequest {
    dataPagamento: string;
    valor: number;
    descricao?: string;
    usuarioId?: number;
}

export interface ComissaoCalculada {
    id?: number; // ID para quitação
    anoMesReferencia: string;
    faturamentoMensal: number;
    faixaComissao: string;
    porcentagemComissao: number;
    valorBrutoComissao: number;
    valorAdiantado: number;
    valorQuitado?: number; // NOVO: Já Pago
    saldoAReceber: number;
    saldoAnterior?: number; // NOVO: Saldo do mês anterior (carryover)
    quitado?: boolean; // NOVO: Se foi pago
    dataQuitacao?: string; // NOVO: Data do pagamento
}

// DRE Categories (Standardized)
export type CategoriaDespesa =
    | 'MATERIAIS_APLICADOS' | 'SERVICOS_TERCEIROS'
    | 'SALARIOS' | 'PROLABORE' | 'COMISSOES' | 'BENEFICIOS' | 'ENCARGOS_SOCIAIS' | 'ADIANTAMENTOS'
    | 'OCUPACAO' | 'UTILIDADES' | 'MANUTENCAO_PREDIAL' | 'MATERIAL_USO_CONSUMO' | 'SERVICOS_PROFISSIONAIS' | 'DIVERSOS'
    | 'MARKETING' | 'VIAGENS_REPRESENTACAO' | 'COMBUSTIVEL' | 'ALIMENTACAO' | 'MANUTENCAO_VEICULO'
    | 'TARIFAS_BANCARIAS' | 'JUROS_PASSIVOS'
    | 'IMPOSTOS_SOBRE_VENDA' | 'TAXAS_DIVERSAS'
    | 'OUTROS';

export interface Despesa {
    id: number;
    dataDespesa: string;
    valor: number;
    categoria: CategoriaDespesa;
    descricao?: string;
    dataCriacao: string;
    cartao?: CartaoCredito;
}

export interface DespesaRequest {
    dataDespesa: string;
    valor: number;
    categoria: string;
    descricao: string;
    pagoAgora?: boolean;
    dataVencimento?: string;
    meioPagamento?: string;
    cartaoId?: number;
    numeroParcelas?: number;
}

export interface RelatorioFinanceiro {
    despesasPorCategoria: Record<string, number>;
    faturamentoTotal: number;
    despesasTotal: number;
    imposto: number;
    adiantamentosTotal: number;
    comissaoAlocada: number;
    saldoRemanescenteComissao: number;
    totalGeral: number;
    lucroLiquido: number;
}

export interface ErrorResponse {
    status: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
}

export interface ApiResponse<T> {
    data?: T;
    error?: ErrorResponse;
    isLoading: boolean;
    isError: boolean;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
    };
    numberOfElements: number;
    first: boolean;
    empty: boolean;
}

export interface DashboardStatsResponse {
    activeOsCount: number;
    finalizedMonthCount: number;
    veiculosMonthCount: number;
    pecasMonthCount: number;
    totalAPagarPendente: number;
    totalAReceberPendente: number;
    contasPagarVencendoProximos7Dias: number;
    recebimentosVencendoProximos7Dias: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string; // User specified 'password' in the JSON example
}

export interface UserResponse {
    token: string;
    email: string;
    name?: string;
    role?: string;
    roles?: string[];
    expiresIn: number;

    // V2 Multi-Tenant
    empresa?: Empresa;
    features?: string[];
    mustChangePassword?: boolean;
    participaComissao?: boolean;
    diasParaVencimento?: number;
}

export interface Empresa {
    id?: number;
    nome: string;
    plano: 'BRONZE' | 'PRATA' | 'OURO' | string;
}

// Commission Mode Configuration
export type ModoComissao = 'INDIVIDUAL' | 'COLETIVA';

// Regimes Tributários
export type RegimeTributario = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

// Estados do Brasil
export type UF = 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export interface EmpresaConfig {
    id: number;
    nome: string;
    modoComissao: ModoComissao;
    logoUrl: string | null;
    // Configuração Tributária
    aliquotaImposto?: number; // Ex: 0.06 = 6%
    regimeTributario?: RegimeTributario;
    uf?: UF;
    // Dados de Cobrança
    razaoSocial?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    pixTipo?: string;
    pixChave?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: string;
}

export interface UploadLogoResponse {
    message: string;
    logoUrl: string;
}

export interface UpdateEmpresaConfigRequest {
    modoComissao?: ModoComissao;
    // Configuração Tributária
    aliquotaImposto?: number;
    regimeTributario?: RegimeTributario;
    uf?: UF;
    // Dados de Cobrança
    razaoSocial?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    pixTipo?: string;
    pixChave?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: string;
}

export interface Feature {
    id?: number;
    codigo: string;
    descricao?: string;
    planoMinimo?: string;
}

export interface User {
    id: number;
    email: string;
    name?: string;
    role?: 'USER' | 'ADMIN' | string;
    roles?: string[];
    active: boolean;

    // V2 Multi-Tenant Fields
    empresa?: Empresa;
    empresaId?: number; // Direct empresaId from backend UserResponse
    features?: Feature[] | string[]; // Can be strings (legacy/mock) or objects (backend)
    mustChangePassword?: boolean;
    participaComissao?: boolean;
    diasParaVencimento?: number;
}

// --- Módulo OS Definitions ---

export type OSStatus = 'ABERTA' | 'EM_EXECUCAO' | 'FINALIZADA' | 'CANCELADA';

export type StatusCliente = 'ATIVO' | 'INATIVO' | 'EM_PROSPECCAO';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

export interface Cliente {
    id: number;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj?: string;
    cpf?: string;
    tipoPessoa?: TipoPessoa;
    endereco?: string; // Mantido para retrocompatibilidade visual se necessario, mas o foco agora são os campos detalhados
    contato: string;
    email: string;
    status: StatusCliente;

    // Address Fields
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
}

export interface ClienteRequest {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj?: string;
    cpf?: string;
    tipoPessoa?: TipoPessoa;
    endereco?: string;
    contato: string;
    email: string;
    status: StatusCliente;

    // Address Fields
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
}

export interface ClienteFiltros {
    termo?: string;
    cidade?: string;
    bairro?: string;
    status?: StatusCliente;
}

export interface TipoPeca {
    id: number;
    nome: string;
    valorPadrao: number;
}

export interface TipoPecaRequest {
    nome: string;
    valorPadrao: number;
}

export interface PecaOS {
    id: number;
    tipoPecaId?: number;
    nomePeca: string;
    valorCobrado: number;
    descricao?: string;
}

export interface VeiculoImagem {
    id: number;
    url: string;
    nomeOriginal: string;
    legenda: string;
    tamanhoBytes: number;
    ordem: number;
}

export interface VeiculoOS {
    id: number;
    placa: string;
    modelo: string;
    cor: string;
    valorTotal: number;
    pecas: PecaOS[];
    imagens?: VeiculoImagem[];
}

export interface VeiculoExistente {
    modelo: string;
    cor: string;
    cliente: string; // Nome fantasia do cliente
}

export interface PlacaCheckResponse {
    existe: boolean;
    mensagem: string;
    veiculoExistente?: VeiculoExistente;
}

export interface HistoricoItem {
    ordemServicoId: number;
    data: string; // Formato ISO "YYYY-MM-DD"
    status: OSStatus;
    valorTotalServico: number;
    pecasOuServicos: string[]; // Lista de nomes das peças/serviços
}

export type HistoricoResponse = HistoricoItem[];

export interface OrdemServico {
    id: number;
    data: string;
    dataVencimento?: string;
    atrasado?: boolean;
    status: OSStatus;
    valorTotal: number;
    // New Discount Fields
    tipoDesconto?: 'PERCENTUAL' | 'VALOR_FIXO';
    valorDesconto?: number;
    valorTotalSemDesconto?: number;
    valorTotalComDesconto?: number;
    cliente: Cliente;
    veiculos: VeiculoOS[];
    // Responsible User
    usuarioId?: number;
    usuarioNome?: string;
    usuarioEmail?: string;
}

export interface CreateOSRequest {
    clienteId: number;
    data: string;
    dataVencimento?: string;
    tipoDesconto?: 'PERCENTUAL' | 'VALOR_FIXO';
    valorDesconto?: number;
    usuarioId?: number;
}

export interface AddVeiculoRequest {
    ordemServicoId: number;
    placa: string;
    modelo: string;
    cor: string;
}

export interface AddPecaRequest {
    veiculoId: number;
    tipoPecaId: number;
    valorCobrado?: number; // Optional, uses default if null
    descricao?: string; // Optional description/notes
    // Campos para serviço terceirizado
    tipoExecucao?: TipoExecucao;
    prestadorId?: number;
    custoPrestador?: number;
    dataVencimentoPrestador?: string; // Data no formato ISO (YYYY-MM-DD)
}

export interface UpdateOSStatusRequest {
    status: OSStatus;
}

// --- Year-over-Year Revenue Comparison ---

export interface ComparacaoFaturamentoDTO {
    faturamentoAtual: number;
    faturamentoAnoAnterior: number;
    diferencaAbsoluta: number;
    diferencaPercentual: number;
    temDadosAnoAnterior: boolean;
}

export interface MesFaturamentoDTO {
    mes: number;
    nomeMes: string;
    faturamento: number;
    faturamentoAnoAnterior: number;
    variacao: number;
    variacaoPercentual: number;
}

export interface RelatorioAnualDTO {
    ano: number;
    mesesComFaturamento: MesFaturamentoDTO[];
    faturamentoTotalAno: number;
    faturamentoTotalAnoAnterior: number;
    diferencaAnual: number;
    crescimentoPercentualAnual: number;
}

// --- Sistema de Comissão Flexível ---

export type TipoRegraComissao = 'FAIXA_FATURAMENTO' | 'FIXA_FUNCIONARIO' | 'FIXA_EMPRESA' | 'HIBRIDA';
export type TipoRemuneracao = 'COMISSAO' | 'SALARIO_FIXO' | 'MISTA';

export interface FaixaComissaoConfig {
    id?: number;
    minFaturamento: number;
    maxFaturamento: number | null;
    porcentagem: number;
    descricao?: string;
}

export interface RegraComissao {
    id: number;
    nome: string;
    tipoRegra: TipoRegraComissao;
    descricao?: string;
    dataInicio: string;
    dataFim?: string;
    ativa: boolean;
    faixas: FaixaComissaoConfig[];
}

export interface SalarioFuncionario {
    id: number;
    usuario: { id: number; name?: string; email: string };
    tipoRemuneracao: TipoRemuneracao;
    salarioBase?: number;
    percentualComissao?: number;
    dataInicio: string;
    dataFim?: string;
    ativo: boolean;
}

// Requests
export interface RegraComissaoRequest {
    nome: string;
    tipoRegra: TipoRegraComissao;
    descricao?: string;
    dataInicio: string;
    dataFim?: string;
    faixas: Omit<FaixaComissaoConfig, 'id'>[];
}

export interface SalarioFuncionarioRequest {
    usuarioId: number;
    tipoRemuneracao: TipoRemuneracao;
    salarioBase?: number;
    percentualComissao?: number;
    dataInicio: string;
    dataFim?: string;
}

export interface RankingCliente {
    clienteId: number;
    nomeFantasia: string;
    quantidadeOS: number;
    valorTotal: number;
}

// ========================================
// MÓDULO FINANCEIRO - CONTAS A PAGAR/RECEBER
// ========================================

export type StatusConta = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO' | 'BAIXADO';
export type MeioPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO' | 'TRANSFERENCIA' | 'CHEQUE';

// Updated TipoContaPagar (Cash Flow Standard)
export type TipoContaPagar =
    | 'OPERACIONAL'
    | 'FOLHA_PAGAMENTO'
    | 'IMPOSTOS'
    | 'EMPRESTIMOS'
    | 'DISTRIBUICAO_LUCROS'
    | 'FATURA_CARTAO'
    | 'OUTROS';

export type TipoContaReceber = 'ORDEM_SERVICO' | 'VENDA_DIRETA' | 'OUTROS';

export interface ContaPagar {
    id: number;
    descricao: string;
    valor: number;
    dataCompetencia: string;
    dataVencimento: string;
    dataPagamento?: string;
    status: StatusConta;
    tipo: TipoContaPagar;
    meioPagamento?: MeioPagamento;
    numeroParcela?: number;
    totalParcelas?: number;
    dataCriacao: string;
}

export interface Recebimento {
    id: number;
    valorPago: number;
    dataPagamento: string;
    meioPagamento?: MeioPagamento;
    observacao?: string;
}

export interface ContaReceber {
    id: number;
    descricao: string;
    valor: number;
    valorPagoAcumulado: number;
    saldoRestante: number;
    observacao?: string;
    dataCompetencia: string;
    dataVencimento: string;
    dataRecebimento?: string;
    status: StatusConta;
    tipo: TipoContaReceber;
    meioPagamento?: MeioPagamento;
    dataCriacao: string;
    cliente?: Cliente;
    ordemServico?: OrdemServico;
}

export interface ResumoFinanceiro {
    totalAPagar: number;
    totalAReceber: number;
    contasVencendoProximos7Dias: number;
    recebimentosVencendoProximos7Dias: number;
    saldoProjetado: number;
    saldoAtual: number;
}

export interface FluxoCaixa {
    periodo: string;
    entradas: number;
    saidas: number;
    saldo: number;
}

export interface PagarContaRequest {
    dataPagamento?: string;
    meioPagamento: MeioPagamento;
}

export interface ReceberContaRequest {
    dataRecebimento?: string;
    meioPagamento: MeioPagamento;
}

export interface CartaoCredito {
    id: number;
    nome: string;
    diaVencimento: number;
    diaFechamento: number;
    limite?: number;
    ativo: boolean;
}

export interface CartaoCreditoRequest {
    nome: string;
    diaVencimento: number;
    diaFechamento?: number;
    limite?: number;
}

export interface LimiteDisponivelDTO {
    limiteTotal: number | null;
    limiteDisponivel: number | null;
    limiteUtilizado: number | null;
}

// ========================================
// PRESTADORES DE SERVIÇO EXTERNOS
// ========================================

export type TipoExecucao = 'INTERNO' | 'TERCEIRIZADO';

export interface Prestador {
    id: number;
    nome: string;
    telefone?: string;
    chavePix?: string;
    ativo: boolean;
}

export interface PrestadorRequest {
    nome: string;
    telefone?: string;
    chavePix?: string;
}
