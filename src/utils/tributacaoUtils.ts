import type { RegimeTributario, UF } from '../types';

export interface TributacaoFormValues {
    aliquotaPercent: string;
    regime: RegimeTributario;
    uf: UF | '';
}

export function parseAliquotaDecimal(aliquotaPercent: string): number | null {
    const normalized = aliquotaPercent.replace(',', '.').trim();
    if (!normalized) return null;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
        return null;
    }
    return Number((value / 100).toFixed(4));
}

export function getAliquotaWarning(aliquotaPercent: string): string | null {
    const decimal = parseAliquotaDecimal(aliquotaPercent);
    if (decimal === null) return null;
    const pct = decimal * 100;
    if (pct === 0) {
        return 'Atenção: alíquota 0,00% zera o imposto calculado no DRE. Confirme se isso se aplica ao seu regime.';
    }
    if (pct > 35) {
        return 'Atenção: alíquota acima de 35% é incomum. Verifique com seu contador antes de salvar.';
    }
    return null;
}

export function simularImpactoTributario(faturamento: number, aliquotaPercent: string): {
    aliquotaPct: number;
    imposto: number;
    receitaLiquida: number;
} {
    const decimal = parseAliquotaDecimal(aliquotaPercent) ?? 0;
    const fat = Number.isFinite(faturamento) && faturamento > 0 ? faturamento : 0;
    const imposto = fat * decimal;
    return {
        aliquotaPct: decimal * 100,
        imposto,
        receitaLiquida: Math.max(0, fat - imposto),
    };
}

export function hasTributacaoChanges(
    current: TributacaoFormValues,
    initial: TributacaoFormValues
): boolean {
    const curDec = parseAliquotaDecimal(current.aliquotaPercent);
    const iniDec = parseAliquotaDecimal(initial.aliquotaPercent);
    return (
        curDec !== iniDec ||
        current.regime !== initial.regime ||
        current.uf !== initial.uf
    );
}
