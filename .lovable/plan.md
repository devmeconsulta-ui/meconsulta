
# Plano: Corrigir Reprodução de Áudio do WhatsApp

## Problema Identificado

Apos investigação detalhada, identifiquei a causa raiz:

**Os arquivos de áudio do WhatsApp estao em formato OGG/Opus, que NAO e suportado pelo Safari (iOS/macOS).**

| Navegador | OGG/Opus | MP3 |
|-----------|----------|-----|
| Chrome    | Sim      | Sim |
| Firefox   | Sim      | Sim |
| Edge      | Sim      | Sim |
| Safari    | **NAO**  | Sim |

Se voce esta usando Safari, isso explica por que o play nao funciona.

## Solucao

Converter os audios de OGG para MP3 no momento em que sao recebidos do WhatsApp. MP3 e universalmente suportado por TODOS os navegadores.

## Mudancas Necessarias

### 1. Edge Function: `evolution-webhook` (Conversao de Audio)

Atualizar a funcao `downloadAndUploadMedia` para converter audios OGG para MP3 usando FFmpeg via servico externo (CloudConvert API ou similar).

```text
+------------------+     +------------------+     +------------------+
| WhatsApp Audio   | --> | Evolution API    | --> | Converter para   |
| (OGG/Opus)       |     | (base64)         |     | MP3              |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                              +------------------+
                                              | Supabase Storage |
                                              | (MP3 publico)    |
                                              +------------------+
```

**Opcao A - Usar servico de conversao online:**
- Integrar com CloudConvert, Zamzar, ou similar
- Custo: ~$0.01 por conversao

**Opcao B - Fallback duplo no frontend:**
- Manter OGG original
- Adicionar fonte MP3 alternativa
- Usar `<audio>` com multiplos `<source>`

### 2. Frontend: `AudioPlayerWithFallback.tsx`

Implementar player com fallback multiplo:

```tsx
<audio controls preload="auto" playsInline>
  <source src={url.replace('.ogg', '.mp3')} type="audio/mpeg" />
  <source src={url} type="audio/ogg" />
  Seu navegador nao suporta audio.
</audio>
```

### 3. Solucao Imediata (Sem Conversao)

Se nao quiser configurar conversao de audio, a solucao mais simples e:

- Exibir mensagem clara para usuarios Safari
- Oferecer link de download direto
- Recomendar uso de Chrome/Firefox

## Recomendacao

**Implementar Opcao B** (fallback duplo) como solucao imediata, e depois avaliar conversao server-side para melhor experiencia.

## Arquivos a Modificar

1. `src/components/clinica/omnichannel/AudioPlayerWithFallback.tsx`
   - Adicionar deteccao de navegador
   - Implementar fallback com download

2. `supabase/functions/evolution-webhook/index.ts` (opcional)
   - Adicionar conversao OGG->MP3

## Proximos Passos

1. Me confirme qual navegador voce esta usando (Chrome, Safari, Firefox, Edge)
2. Escolha entre:
   - **Opcao A**: Conversao automatica no servidor (requer API key de conversao)
   - **Opcao B**: Fallback no frontend com download para Safari
   - **Opcao C**: Apenas suportar Chrome/Firefox/Edge (sem Safari)

## Secao Tecnica

### Por que o Safari nao suporta OGG/Opus

Safari usa o decoder de media do sistema operacional (macOS/iOS). A Apple decidiu nao incluir suporte nativo para o codec Opus por questoes de licenciamento e preferencia por seus proprios formatos (AAC, ALAC).

### Alternativas de Conversao

1. **FFmpeg no Deno** - Complexo, requer binarios nativos
2. **CloudConvert API** - Simples, pago (~$0.01/arquivo)
3. **WebAssembly FFmpeg** - Possivel no frontend, mas pesado
4. **Servidor Node.js dedicado** - Mais controle, mais infraestrutura

### Estrutura atual do arquivo de audio

```text
URL: https://dwqceailivjjacvqzfnh.supabase.co/storage/v1/object/public/omni-files/omni/.../audio_xxx.ogg
Tipo: audio/ogg; codecs=opus
Tamanho: 5-15KB (tipico)
```
