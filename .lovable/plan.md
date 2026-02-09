
# Plano de Correção: Reprodução de Áudios no WhatsApp Chat

## Diagnóstico do Problema

Após uma análise detalhada dos logs, código e documentação da Evolution API, identifiquei a causa raiz:

1. **O parâmetro `convertToMp4` só funciona para vídeo, não para áudio** - a documentação da Evolution API especifica claramente: "Convert video to MP4, for video only"

2. **Formato real dos arquivos**: O WhatsApp envia áudios no formato **OGG com codec Opus**. A Evolution API retorna esse formato sem conversão.

3. **Problema de salvamento**: O código atual força o mime type `audio/mp4` e extensão `.m4a`, mas o conteúdo real é OGG/Opus. Isso causa incompatibilidade de formato/container.

4. **Suporte de navegadores**:
   - Chrome, Firefox, Edge: Suportam audio/ogg com Opus
   - Safari (iOS/macOS): NÃO suporta OGG nativo

---

## Solução Proposta

### Parte 1: Corrigir o Webhook (evolution-webhook)

Modificar a lógica de salvamento para manter o formato correto:

```text
Antes:
- Forçava audio/mp4 + .m4a para todos os áudios
- Conteúdo era OGG mas mime type dizia MP4

Depois:
- Mantém audio/ogg + .ogg (formato real do WhatsApp)
- Remove o parâmetro convertToMp4 para áudio (não funciona)
- Adiciona log do mime type recebido para debug
```

### Parte 2: Melhorar o Player de Áudio no Frontend

Para garantir compatibilidade máxima:

1. **Adicionar tratamento de erro robusto** - se o áudio falhar, mostrar mensagem amigável
2. **Verificar suporte do navegador** - detectar Safari e mostrar aviso se necessário  
3. **Fallback para download** - permitir baixar o áudio se não puder reproduzir

### Parte 3: Considerar Conversão Server-Side (Opcional Futuro)

Para suporte total ao Safari, seria necessário converter OGG para MP3/M4A no servidor usando FFmpeg. Isso é mais complexo e pode ser implementado posteriormente se o Safari for usado pelos usuários.

---

## Mudanças Técnicas

### Arquivo: `supabase/functions/evolution-webhook/index.ts`

```javascript
// REMOVER o convertToMp4 para áudio (não funciona)
body: JSON.stringify({
  message: { key: { id: messageKey } },
  // Não usar convertToMp4 - apenas funciona para vídeo
}),

// CORRIGIR o mime type e extensão para áudio
if (mediaType === "audio") {
  // Manter formato original OGG/Opus do WhatsApp
  // Chrome, Firefox, Edge suportam nativamente
  normalizedMime = "audio/ogg";
  ext = "ogg";
  console.log("[Media] Keeping original audio format: audio/ogg");
}
```

### Arquivo: `src/pages/clinica/omnichannel/OmniWhatsAppChat.tsx`

Melhorar o componente de áudio com fallback:

```jsx
{mensagem.tipo === "audio" && mensagem.arquivo_url && (
  <div className="flex items-center gap-2">
    <audio 
      controls 
      src={mensagem.arquivo_url}
      className="max-w-[250px] h-10" 
      preload="metadata"
      onError={(e) => {
        console.error("Erro ao carregar áudio:", mensagem.arquivo_url);
        // Mostrar botão de download como fallback
      }}
    />
  </div>
)}
```

---

## Ordem de Implementação

1. Atualizar `evolution-webhook` para salvar com formato OGG correto
2. Fazer deploy da edge function
3. Melhorar player de áudio com fallback
4. Testar com novo áudio enviado pelo contato

---

## Navegadores Suportados

| Navegador | Suporte OGG/Opus |
|-----------|------------------|
| Chrome | Sim |
| Firefox | Sim |
| Edge | Sim |
| Safari | Não (requer conversão) |

Se muitos usuários usam Safari, uma fase 2 pode implementar conversão via FFmpeg no servidor.
