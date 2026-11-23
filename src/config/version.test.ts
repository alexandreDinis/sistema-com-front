import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { APP_VERSION, APP_VERSION_LABEL } from './version';

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

describe('APP_VERSION', () => {
    it('deve refletir exatamente a versão declarada no package.json', () => {
        expect(APP_VERSION).toBe(pkg.version);
        expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
    });

    it('deve seguir o formato SemVer válido', () => {
        expect(APP_VERSION).toMatch(SEMVER_REGEX);
    });
});
