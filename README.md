# Portal de Benefícios Jaguacy

Aplicação web (portal do colaborador + área do RH) com narração em áudio gerada por IA, pronta para ser hospedada em HTTPS e aberta/incorporada na Humand.

## Arquitetura (e por quê)

```
Colaborador (celular/PC, dentro da Humand)           RH (login)
        │  HTTPS                                          │  HTTPS
        ▼                                                 ▼
  public/index.html  (portal)                  public/admin/  (administração)
        └───────────────┬─────────────────────────────────┘
                        ▼
              server/server.js  (Node 22, sem dependências npm)
        ┌───────────┬───────────┬───────────────┐
        ▼           ▼           ▼               ▼
   SQLite (db)   /data/audio   /data/images   IA externa (só quando o RH salva/gera):
   fazendas,     MP3 gerados   imagens        1) Claude ou OpenAI → texto simples + roteiro
   benefícios,                                2) OpenAI TTS ou Google TTS → MP3
   usuários, log
```

- **Sem dependências npm**: usa apenas o Node 22 (SQLite embutido, `fetch`, `crypto`). Menos coisa para atualizar e vulnerabilidades de terceiros.
- **HTML nunca muda** quando o RH atualiza benefícios: o portal lê tudo da API.
- **Benefícios separados por fazenda** (`farm_id`), com categorias próprias derivadas dos benefícios *publicados* (nunca há categoria vazia).
- **IA roda só quando o RH cadastra/atualiza/pede**, nunca quando o colaborador abre a página. O áudio fica salvo em arquivo.
- **Validação humana obrigatória**: a IA deixa o benefício em "Aguardando revisão"; só o RH publica. Mudar o texto de um benefício publicado o tira do ar até nova aprovação. Não publica sem explicação **e** áudio atualizado.
- **A IA não inventa**: o prompt só permite usar o texto fornecido; o que faltar vai para "Falta confirmar com o RH" (visível ao RH e ao colaborador).
- **Falha da IA**: o cadastro é preservado, aparece o aviso "narração ainda não gerada" e é possível tentar de novo, escrever o texto à mão ou enviar um MP3 próprio.

### Segurança
Login real no servidor (senha com scrypt, sessão em cookie `HttpOnly`, limite de tentativas), perfis *administrador* e *editor por fazenda*, proteção contra CSRF, CSP restritiva, chaves de API só em variáveis de ambiente (nunca no HTML/JS), histórico de quem alterou o quê.

## Estrutura de dados do benefício
`id` (uuid) · `farm_id` · `name` · `category` · `official_description` (versão 1, intocada) · `usage_rules` · `conditions` · `simple_text` (versão 2) · `audio_script` (versão 3) · `audio_url` · `image_url` · `status` (draft/review/published/rejected) · `updated_at` · `updated_by` — ver `server/db.js`.

## Rodar no seu computador
Requer Node 22.13+.
```bash
npm run demo     # demonstração com IA de mentira e exemplos fictícios (sem chaves)
npm test         # 11 testes de ponta a ponta
```
Produção local: copie `.env.example` para `.env`, preencha e rode `npm start`. Portal em `/`, administração em `/admin/`. Mais usuários: `npm run create-admin -- email "Nome" "senha"` ou pela aba Usuários.

## Serviços externos e custos
| Serviço | Para quê | Custo | Alternativa |
|---|---|---|---|
| Hospedagem com **disco persistente** e HTTPS | rodar o portal | pago, baixo (VPS pequena ou plataforma com volume) | ver `docs/HOSPEDAGEM.md` |
| Anthropic (Claude) **ou** OpenAI | simplificar texto e escrever roteiro | cobrança por uso; centavos por benefício | trocar com `LLM_PROVIDER` |
| OpenAI TTS **ou** Google Cloud TTS | gerar o MP3 | por uso; Google costuma ter cota mensal gratuita (confirme valores vigentes) | `TTS_PROVIDER` |
| Domínio / HTTPS | endereço seguro | domínio pago; certificado grátis (Let's Encrypt) | subdomínio da empresa |

**Gratuito de verdade:** o RH pode dispensar a IA, escrever os textos e **enviar MP3 próprios** (gravados por uma pessoa). A voz do navegador (gratuita) não foi usada porque soa pior e varia entre aparelhos.

## Limitações e o que NÃO foi verificado
- **Humand não foi testado.** Não havia ambiente da Humand disponível; veja `docs/HUMAND.md` para o que confirmar com eles.
- **IA real não foi testada com chaves reais.** Os testes automáticos usam um servidor de IA falso (`test/mock-ai.js`) para validar todo o fluxo do nosso sistema; o formato das chamadas segue a documentação pública de Anthropic, OpenAI e Google, mas faça o primeiro teste real com as suas chaves (passo a passo no manual).
- **Nenhum benefício foi cadastrado**: eles não foram enviados; as oito fazendas nascem vazias. Fartura e Tejupá aparecem como "Nome a confirmar" até o RH editar (aba Fazendas).
- **Logotipo oficial**: não foi possível obter o arquivo; o cabeçalho usa um abacate simples + texto. Salve o logo em `public/assets/logo.png` e ele é usado automaticamente.
- **Personagens**: usados os 12 PNG recebidos (fundo removido por `tools/prep_personagens.py`). Na tela aparecem "Coordenador" (boas-vindas), "Posso Ajudar" (orientação) e "Estou de Olho" (fazenda sem benefícios). Os demais ficaram disponíveis em `public/assets/personagens/`.
- O portal de consulta **não exige login** (a Humand não oferece SSO para apps externos que se possa presumir). Quem tiver o link vê os benefícios publicados; não coloque ali dados pessoais de colaboradores.
- Não há acesso offline, e o áudio publicado é acessível por link direto.
