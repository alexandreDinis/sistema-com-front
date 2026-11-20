import type { ContaPagar } from '../types';
import { formatarDataLocal } from './faturaUtils';

export type NivelAlertaPagamento = 'NORMAL' | 'ANTECIPADO' | 'FATURA_FUTURA' | 'BLOQUEADO';

export interface DiagnosticoPagamento {
    nivel: NivelAlertaPagamento;
    titulo: string;
    mensagem: string;
    diasAntecipacao: number;
    mesImpactoCaixa: string;
    dataFechamentoReal?: string;
    podeConfirmar: boolean;
}

const NOMES_MESES_COMPLETOS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseIsoDateUtc(iso: string): number {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

export function diferencaDiasIso(dataInicioIso: string, dataFimIso: string): number {
    if (!dataInicioIso || !dataFimIso) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((parseIsoDateUtc(dataFimIso) - parseIsoDateUtc(dataInicioIso)) / msPerDay);
}

export function formatarMesCompleto(dataIso: string): string {
    const match = dataIso.match(/^(\d{4})-(\d{2})/);
    if (!match) return dataIso;
    const mesIdx = Number(match[2]) - 1;
    if (mesIdx < 0 || mesIdx > 11) return dataIso;
    return `${NOMES_MESES_COMPLETOS[mesIdx]}/${match[1]}`;
}

/**
 * Resolve a data real de fechamento do ciclo de uma fatura de cartão.
 * Prioriza dataCompetencia (gravada pelo backend no dia do fechamento);
 * caso ausente, calcula por mesReferencia + diaFechamento.
 */
export function obterDataFechamentoFatura(conta: ContaPagar): string | undefined {
    if (conta.tipo !== 'FATURA_CARTAO') return undefined;
    if (conta.dataCompetencia && /^\d{4}-\d{2}-\d{2}/.test(conta.dataCompetencia)) {
        return conta.dataCompetencia.slice(0, 10);
    }
    if (conta.mesReferencia && /^\d{4}-\d{2}$/.test(conta.mesReferencia)) {
        const [ano, mes] = conta.mesReferencia.split('-').map(Number);
        const diaFech = conta.cartao?.diaFechamento ?? 25;
        const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
        const dia = Math.min(diaFech, ultimoDia);
        return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    return undefined;
}

/**
 * Classifica o nível de atenção do pagamento com base no status real,
 * no ciclo de fechamento da fatura e na diferença entre data efetiva e vencimento.
 */
export function classificarPagamento(
    conta: ContaPagar,
    dataPagamentoIso: string
): DiagnosticoPagamento {
    const mesImpactoCaixa = formatarMesCompleto(dataPagamentoIso);
    const diasAntecipacao = diferencaDiasIso(dataPagamentoIso, conta.dataVencimento);
    const dataFechamentoReal = obterDataFechamentoFatura(conta);

    // Nível 4: Bloqueado (já pago ou cancelado/estornado)
    if (conta.status === 'PAGO') {
        const dtPgto = conta.dataPagamento ? formatarDataLocal(conta.dataPagamento) : 'data anterior';
        return {
            nivel: 'BLOQUEADO',
            titulo: 'Conta já paga — pagamento bloqueado',
            mensagem: `Esta conta já foi paga em ${dtPgto}. Para corrigir um pagamento indevido, utilize o fluxo auditável de Estorno.`,
            diasAntecipacao,
            mesImpactoCaixa,
            dataFechamentoReal,
            podeConfirmar: false,
        };
    }

    if (conta.status !== 'PENDENTE') {
        return {
            nivel: 'BLOQUEADO',
            titulo: `Pagamento indisponível (${conta.status})`,
            mensagem: `Contas com status ${conta.status} não podem receber novo pagamento.`,
            diasAntecipacao,
            mesImpactoCaixa,
            dataFechamentoReal,
            podeConfirmar: false,
        };
    }

    // Nível 3: Fatura de cartão ainda aberta / ciclo futuro (data efetiva < fechamento real)
    if (dataFechamentoReal && diferencaDiasIso(dataPagamentoIso, dataFechamentoReal) > 0) {
        return {
            nivel: 'FATURA_FUTURA',
            titulo: 'Atenção máxima: fatura ainda aberta / ciclo futuro',
            mensagem: `O fechamento desta fatura ocorre em ${formatarDataLocal(dataFechamentoReal)}. Pagar em ${formatarDataLocal(dataPagamentoIso)} antecede o fechamento do ciclo — novas despesas ainda podem entrar neste período.`,
            diasAntecipacao,
            mesImpactoCaixa,
            dataFechamentoReal,
            podeConfirmar: true,
        };
    }

    // Nível 2: Pagamento antecipado (após fechamento, porém antes do vencimento)
    if (diasAntecipacao > 0) {
        return {
            nivel: 'ANTECIPADO',
            titulo: 'Pagamento antecipado',
            mensagem: `Você está registrando o pagamento ${diasAntecipacao} dia(s) antes do vencimento (${formatarDataLocal(conta.dataVencimento)}).`,
            diasAntecipacao,
            mesImpactoCaixa,
            dataFechamentoReal,
            podeConfirmar: true,
        };
    }

    // Nível 1: Normal (no dia do vencimento ou após vencimento)
    const detalheVencimento =
        diasAntecipacao === 0
            ? 'Pagamento na data exata do vencimento.'
            : `Pagamento registrado ${Math.abs(diasAntecipacao)} dia(s) após o vencimento (${formatarDataLocal(conta.dataVencimento)}).`;

    return {
        nivel: 'NORMAL',
        titulo: 'Confirmação de pagamento',
        mensagem: detalheVencimento,
        diasAntecipacao,
        mesImpactoCaixa,
        dataFechamentoReal,
        podeConfirmar: true,
    };
}
