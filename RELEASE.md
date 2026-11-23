# Processo Oficial de Versionamento e Release — Frontend (Sistema Oroboros)

Este repositório utiliza **Semantic Versioning (SemVer)** coordenado com o repositório Backend (`sistema-comissao`).

- **Fonte oficial de versão do Frontend:** campo `"version"` em `package.json`.
- **Injeção no build:** `vite.config.ts` injeta `__APP_VERSION__` localmente durante o build (sem chamadas ao backend) e `src/config/version.ts` centraliza `APP_VERSION` e `APP_VERSION_LABEL`.
- **Versão durante desenvolvimento:** `2.0.0-dev`.
- **Primeira release oficial planejada:** `2.0.0` (tag `v2.0.0` em ambos os repositórios após validação em `main`).

## Fluxo de Branches

`feature/xxxx` → `development` → `main`

## Checklist Rápido de Release Coordenada

1. Integrar as PRs em `development` e rodar `npm test`, `npm run lint` e `npm run build`.
2. Atualizar `"version"` no `package.json` para `X.Y.Z` (igual ao `<version>` do `pom.xml` do backend).
3. Rodar o validador de sincronização no repositório backend:
   ```bash
   ../sistema-comissao/scripts/check-version-sync.sh --release --tag vX.Y.Z
   ```
4. Abrir PR de `development` → `main` nos dois repositórios (o workflow `.github/workflows/ci.yml` valida testes, build e SemVer final sem `-dev`).
5. Integrar em `main` e validar o deploy em produção.
6. Criar e enviar a tag `vX.Y.Z` em `main` nos dois repositórios — o workflow `.github/workflows/release.yml` valida a tag contra `package.json` (e contra o backend quando `CROSS_REPO_TOKEN` estiver configurado) e publica a GitHub Release com changelog.
