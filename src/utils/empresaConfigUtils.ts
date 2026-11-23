export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_LOGO_SIZE_MB = 2;
export const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

export interface BillingFormValues {
    razaoSocial: string;
    cnpj: string;
    telefone: string;
    email: string;
    endereco: string;
    pixTipo: string;
    pixChave: string;
    banco: string;
    agencia: string;
    conta: string;
    tipoConta: string;
}

export function maskCNPJ(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validateBillingForm(values: BillingFormValues): string | null {
    const cnpjDigits = values.cnpj.replace(/\D/g, '');
    if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        return 'CNPJ incompleto. Informe os 14 dígitos ou deixe o campo em branco.';
    }

    const emailTrimmed = values.email.trim();
    if (emailTrimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return 'E-mail inválido. Verifique o endereço informado.';
    }

    if (values.pixChave.trim().length > 0 && !values.pixTipo) {
        return 'Selecione o Tipo da Chave PIX antes de salvar.';
    }

    return null;
}

export function hasBillingChanges(
    current: BillingFormValues,
    initial: BillingFormValues
): boolean {
    return (Object.keys(initial) as Array<keyof BillingFormValues>).some(
        (key) => current[key].trim() !== initial[key].trim()
    );
}

export function validateLogoFile(file: { type: string; size: number }): string | null {
    if (!(ALLOWED_LOGO_TYPES as readonly string[]).includes(file.type)) {
        return 'Tipo de arquivo inválido. Utilize PNG, JPEG ou WebP.';
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
        return `Arquivo muito grande. O limite máximo é ${MAX_LOGO_SIZE_MB}MB.`;
    }
    return null;
}

export function formatTipoContaLabel(tipoConta: string): string {
    if (tipoConta === 'POUPANCA') return 'Poupança';
    if (tipoConta === 'CORRENTE') return 'Corrente';
    return '';
}

export function getCompanyInitials(razaoSocial?: string, nome?: string): string {
    const source = (razaoSocial || nome || 'MD').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}
