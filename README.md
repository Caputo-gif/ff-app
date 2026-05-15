# 🍃 Chef Nicolas — Guia Completo de Publicação

## 📁 Estrutura do projeto

```
chef-nicolas/
├── api/
│   ├── analyze.js      ← IA de visão + preços regionais
│   └── payment.js      ← Pagamentos Stripe + controle de uso
├── public/
│   ├── index.html      ← App completo (PWA)
│   └── manifest.json   ← Instalar no celular
├── package.json        ← Dependência do Stripe
├── vercel.json         ← Configuração Vercel
└── README.md           ← Este arquivo
```

---

## 🚀 PASSO A PASSO COMPLETO

### ETAPA 1 — GitHub

1. Crie conta em https://github.com/signup
2. Clique em **New repository** → nome: `chef-nicolas` → **Create**
3. Clique em **uploading an existing file**
4. Arraste todos os arquivos desta pasta (respeite as subpastas api/ e public/)
5. Clique em **Commit changes**

### ETAPA 2 — Vercel (publicar)

1. Acesse https://vercel.com/signup → Continue with GitHub
2. Add New Project → selecione `chef-nicolas`
3. Clique em **Deploy** sem mudar nada
4. Aguarde ~2 minutos. Seu link estará pronto!

### ETAPA 3 — Chave Anthropic (IA)

1. Acesse https://console.anthropic.com → API Keys → Create Key
2. Copie a chave (sk-ant-...)
3. No Vercel: Settings → Environment Variables → adicione:
   - Name: ANTHROPIC_API_KEY | Value: sk-ant-sua-chave

### ETAPA 4 — Stripe (pagamentos reais)

> O app funciona em modo DEMO sem Stripe. Para cobrar de verdade:

1. Crie conta em https://stripe.com/br
2. Crie dois produtos:
   - "Análise de foto": R$1,00 pagamento único → copie o Price ID
   - "Acesso ilimitado diário": R$2,00 pagamento único → copie o Price ID
3. No Vercel, adicione as variáveis:
   - STRIPE_SECRET_KEY = sk_live_...
   - STRIPE_PRICE_PHOTO = price_... (produto R$1,00)
   - STRIPE_PRICE_UNLIMITED = price_... (produto R$2,00)
4. Configure webhook:
   - URL: https://SEU-SITE.vercel.app/api/payment?action=webhook
   - Evento: checkout.session.completed
   - Copie o Signing Secret → STRIPE_WEBHOOK_SECRET no Vercel
5. No index.html, remova o bloco "DEMO MODE" (4 linhas após o comentário)

### ETAPA 5 — Vercel KV (rastrear uso)

1. No Vercel: Storage → Create Database → KV
2. Clique em Connect no projeto chef-nicolas
3. As variáveis são adicionadas automaticamente

### ETAPA 6 — Republicar

No Vercel: Deployments → três pontos → Redeploy

### ETAPA 7 — Compartilhar!

Link: https://chef-nicolas.vercel.app

Para instalar no celular como app:
- iPhone: Safari → Compartilhar → Adicionar à Tela de Início
- Android: Chrome → Menu → Adicionar à tela inicial

---

## 💰 Modelo de receita

| Ação | Valor |
|------|-------|
| Análise de foto por IA | R$ 1,00 por foto |
| Acesso ilimitado à biblioteca no dia | R$ 2,00 |
| Loja (futuro) | Comissão sobre vendas |

Exemplo: 100 usuários x 3 fotos/mês = R$300
Custos: API ~R$15 + Stripe taxas ~R$21 = R$36
Lucro estimado: ~R$264/mês com apenas 100 usuários

---

## 🛒 E-commerce (próximos passos)

A aba Loja já está pronta. Para ativar:
1. Integrar com Shopify ou criar carrinho próprio
2. Parcerias com produtores locais para ingredientes frescos
3. Stripe já configurado — adicionar produtos físicos é simples

---

Feito com amor pelo Chef Nicolas, Ubatuba-SP
