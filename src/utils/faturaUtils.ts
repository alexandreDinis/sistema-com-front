const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface PreviaFatura {
    mesReferencia: string;
    labelMes: string;
    caiuProximoMes: boolean;
}

/**
 * Calcula o mês de referência da fatura (yyyy-MM) usando a mesma regra do backend:
 * se o dia da despesa for maior que o dia de fechamento, cai na fatura do mês seguinte.
 */
export function calcularMesReferenciaFatura(
    dataDespesa: string,
    diaFechamento?: number | null
): PreviaFatura | null {
    if (!dataDespesa || !/^\d{4}-\d{2}-\d{2}/.test(dataDespesa)) {
        return null;
    }

    const [anoStr, mesStr, diaStr] = dataDespesa.slice(0, 10).split('-');
    let ano = Number(anoStr);
    let mes = Number(mesStr); // 1-12
    const dia = Number(diaStr);

    if (!ano || !mes || !dia) {
        return null;
    }

    const fechamento = diaFechamento && diaFechamento > 0 ? diaFechamento : 25;
    const caiuProximoMes = dia > fechamento;

    if (caiuProximoMes) {
        mes += 1;
        if (mes > 12) {
            mes = 1;
            ano += 1;
        }
    }

    const mesPadded = String(mes).padStart(2, '0');
    return {
        mesReferencia: `${ano}-${mesPadded}`,
        labelMes: `${NOMES_MESES[mes - 1]}/${ano}`,
        caiuProximoMes,
    };
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para DD/MM/YYYY sem sofrer deslocamento de fuso horário.
 */
export function formatarDataLocal(dataIso?: string | null): string {
    if (!dataIso) return '—';
    const match = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return new Date(dataIso).toLocaleDateString('pt-BR');
}
