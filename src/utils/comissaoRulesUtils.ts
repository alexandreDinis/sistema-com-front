import type { FaixaComissaoConfig, RegraComissaoRequest } from '../types';

export type FaixaInput = Omit<FaixaComissaoConfig, 'id'>;

const TIPO_REGRA_LABELS: Record<string, string> = {
    FAIXA_FATURAMENTO: 'Faixas de Faturamento',
    FIXA_FUNCIONARIO: 'Fixa por Prestador',
    FIXA_EMPRESA: 'Fixa da Empresa',
    HIBRIDA: 'Híbrida',
};

export function getTipoRegraLabel(tipo: string): string {
    return TIPO_REGRA_LABELS[tipo] || tipo;
}

export function isRegraExpirada(dataFim?: string, today: Date = new Date()): boolean {
    if (!dataFim) return false;
    const end = new Date(`${dataFim}T23:59:59`);
    return !Number.isNaN(end.getTime()) && end < today;
}

export function formatRuleDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
        return `${day}/${month}/${year}`;
    }
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString('pt-BR');
}

export interface RegraValidationResult {
    errors: string[];
    warnings: string[];
}

export function validateRegraComissao(data: RegraComissaoRequest): RegraValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.nome || !data.nome.trim()) {
        errors.push('O nome da regra é obrigatório.');
    }

    if (!data.dataInicio) {
        errors.push('A data de início é obrigatória.');
    }

    if (data.dataInicio && data.dataFim && data.dataFim < data.dataInicio) {
        errors.push('A data de fim não pode ser anterior à data de início.');
    }

    if (data.tipoRegra === 'FAIXA_FATURAMENTO') {
        const faixas = data.faixas || [];
        if (faixas.length === 0) {
            errors.push('Adicione pelo menos uma faixa de comissão.');
            return { errors, warnings };
        }

        faixas.forEach((faixa, idx) => {
            if (!Number.isFinite(faixa.minFaturamento) || faixa.minFaturamento < 0) {
                errors.push(`Valor mínimo da faixa ${idx + 1} não pode ser negativo.`);
            }
            if (
                faixa.maxFaturamento !== null &&
                faixa.maxFaturamento !== undefined &&
                faixa.maxFaturamento <= faixa.minFaturamento
            ) {
                errors.push(`Valor máximo da faixa ${idx + 1} deve ser maior que o mínimo.`);
            }
            if (!Number.isFinite(faixa.porcentagem) || faixa.porcentagem < 0 || faixa.porcentagem > 100) {
                errors.push(`Percentual da faixa ${idx + 1} deve estar entre 0% e 100%.`);
            }
        });

        const sorted = [...faixas].sort((a, b) => a.minFaturamento - b.minFaturamento);
        for (let i = 0; i < sorted.length - 1; i++) {
            const atual = sorted[i];
            const proxima = sorted[i + 1];

            if (atual.maxFaturamento === null || atual.maxFaturamento === undefined) {
                errors.push(
                    `A faixa ${i + 1} está sem limite máximo e se sobrepõe à faixa ${i + 2}. Apenas a última faixa pode ficar sem limite.`
                );
            } else if (proxima.minFaturamento <= atual.maxFaturamento) {
                errors.push(`A faixa ${i + 1} se sobrepõe à faixa ${i + 2}.`);
            } else if (proxima.minFaturamento - atual.maxFaturamento > 0.02) {
                warnings.push(
                    `Há uma lacuna entre a faixa ${i + 1} e a faixa ${i + 2}. Faturamentos nesse intervalo ficarão sem faixa aplicável.`
                );
            }
        }
    }

    return { errors, warnings };
}

export function simularComissaoPorFaixas(
    faixas: Array<Pick<FaixaComissaoConfig, 'minFaturamento' | 'maxFaturamento' | 'porcentagem' | 'descricao'>> | undefined,
    valor: number
): {
    faixa: Pick<FaixaComissaoConfig, 'minFaturamento' | 'maxFaturamento' | 'porcentagem' | 'descricao'> | null;
    comissao: number;
} {
    if (!faixas || faixas.length === 0 || !Number.isFinite(valor) || valor < 0) {
        return { faixa: null, comissao: 0 };
    }

    const faixa = faixas.find(
        (f) =>
            valor >= f.minFaturamento &&
            (f.maxFaturamento === null || f.maxFaturamento === undefined || valor <= f.maxFaturamento)
    );

    if (!faixa) {
        return { faixa: null, comissao: 0 };
    }

    return {
        faixa,
        comissao: valor * (faixa.porcentagem / 100),
    };
}
