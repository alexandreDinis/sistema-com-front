import { describe, expect, it } from 'vitest';
import {
    formatTipoContaLabel,
    getCompanyInitials,
    hasBillingChanges,
    maskCNPJ,
    maskPhone,
    MAX_LOGO_SIZE_BYTES,
    validateBillingForm,
    validateLogoFile,
    type BillingFormValues,
} from './empresaConfigUtils';

const BASE_VALUES: BillingFormValues = {
    razaoSocial: 'Martelinho Digital LTDA',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 99876-5432',
    email: 'contato@empresa.com.br',
    endereco: 'Rua A, 100',
    pixTipo: 'CNPJ',
    pixChave: '12.345.678/0001-99',
    banco: 'Itaú',
    agencia: '0412',
    conta: '98765-4',
    tipoConta: 'CORRENTE',
};

describe('empresaConfigUtils', () => {
    it('formata CNPJ e telefone corretamente', () => {
        expect(maskCNPJ('12345678000199')).toBe('12.345.678/0001-99');
        expect(maskPhone('11998765432')).toBe('(11) 99876-5432');
        expect(maskPhone('1133445566')).toBe('(11) 3344-5566');
    });

    it('valida CNPJ incompleto, e-mail inválido e chave PIX sem tipo', () => {
        expect(validateBillingForm(BASE_VALUES)).toBeNull();
        expect(validateBillingForm({ ...BASE_VALUES, cnpj: '12.345' })).toContain('CNPJ');
        expect(validateBillingForm({ ...BASE_VALUES, email: 'invalido' })).toContain('E-mail');
        expect(
            validateBillingForm({ ...BASE_VALUES, pixTipo: '', pixChave: 'chave@pix.com' })
        ).toContain('Tipo da Chave PIX');
    });

    it('detecta alterações não salvas no formulário', () => {
        expect(hasBillingChanges(BASE_VALUES, { ...BASE_VALUES })).toBe(false);
        expect(
            hasBillingChanges({ ...BASE_VALUES, banco: 'Bradesco' }, BASE_VALUES)
        ).toBe(true);
    });

    it('valida tipo e tamanho do arquivo de logo', () => {
        expect(validateLogoFile({ type: 'image/png', size: 1024 })).toBeNull();
        expect(validateLogoFile({ type: 'image/svg+xml', size: 1024 })).toContain('inválido');
        expect(
            validateLogoFile({ type: 'image/jpeg', size: MAX_LOGO_SIZE_BYTES + 1 })
        ).toContain('2MB');
    });

    it('formata rótulo de conta e iniciais da empresa', () => {
        expect(formatTipoContaLabel('CORRENTE')).toBe('Corrente');
        expect(formatTipoContaLabel('POUPANCA')).toBe('Poupança');
        expect(getCompanyInitials('Martelinho Digital LTDA')).toBe('MD');
    });
});
