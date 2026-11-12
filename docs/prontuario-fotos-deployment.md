# Fotos do prontuário para recepção

Disponível globalmente nos menus da clínica e do atendente. A API deriva a
clínica do usuário autenticado no servidor; não aceita clínica, paciente ou
médico enviados pelo navegador como autorização. Consultas antigas vinculadas
pelo local da clínica também estão incluídas. A recepção lê e envia imagens;
somente o médico responsável exclui.

## Publicação coordenada

Não publicar somente o frontend ou somente a mudança de bucket. O login
atual é próprio da aplicação e não produz sessões de Supabase Auth.

1. Inspecionar o projeto `dwqceailivjjacvqzfnh`: funções atualmente publicadas,
   políticas e grants das tabelas de usuários, vínculos, consultas e imagens.
   O repositório contém políticas legadas permissivas de identidade e vínculos;
   elas precisam ser verificadas/corrigidas no banco antes de afirmar isolamento
   completo. Esta migração protege a tabela e o bucket das fotos, não substitui
   uma revisão de autorização das demais tabelas.
2. Aplicar a migração `20261112153157_prepare_prontuario_photo_sessions.sql`.
   Ela é aditiva: cria somente o armazenamento privado das sessões.
   Publicar `prontuario-fotos` e, junto à atualização do frontend, `secure-auth`,
   com os arquivos `_shared`.
   A nova API verifica uma sessão opaca emitida após a validação da senha.
3. Publicar o frontend pelo projeto Lovable atual, identificado pelo badge em
   `https://meconsulta-mirror.lovable.app`:
   `https://lovable.dev/projects/8bf12c8c-f61a-4f30-bda0-f89668d636c8`.
   O projeto antigo do README não deve ser usado para publicação. A Vercel
   também acompanha o repositório, mas não é o endereço informado pela clínica.
   Após confirmar o frontend novo, aplicar `privatize_prontuario_images`
   para fechar os acessos diretos e tornar o bucket privado. Solicitar novo login
   para as sessões antigas. Sessões de fotos duram oito horas e são revogadas
   no logout; mudança de senha ou desativação invalida o acesso no servidor.
4. Verificar com usuário de recepção e médico: busca, foto pela câmera,
   upload, visualização compartilhada e exclusão exclusiva do médico.
5. Testar sem login e com usuário de outra clínica: tabela de imagens,
   API de fotos, upload direto, assinatura direta e URL pública antiga devem
   negar acesso. Verificar que outros buckets continuam funcionando.

URLs temporárias duram cinco minutos; a galeria atualiza os links a cada
quatro minutos. Novos registros guardam somente o caminho do objeto. URLs
públicas antigas no banco são interpretadas apenas se pertencerem ao projeto,
bucket, médico e consulta corretos. Os arquivos antigos não são apagados.
Conteúdo já baixado ou armazenado anteriormente em caches não pode ser desfeito.

## Verificações locais

- `npm run build`
- `npx tsc --noEmit -p tsconfig.app.json`
- `npx deno check supabase/functions/prontuario-fotos/index.ts supabase/functions/secure-auth/index.ts`
- `npx deno test supabase/functions/prontuario-fotos/index_test.ts`

Migrações também validadas em Postgres local via PGlite: leitores anon/authenticated
não acessam imagens ou sessões nem alteram objetos do bucket, mesmo com política
permissiva global preexistente; service_role e outros buckets preservados.

## Inspeção de produção em 12/11/2026

- Projeto correto acessível pela conexão SUPABASE MECONSULTA.
- Três registros de imagens e três objetos existentes, preservados.
- Confirmados bucket público e políticas/grants permissivos nas fotos.
- Confirmadas também políticas legadas permissivas em identidade, vínculos e
  consultas. São riscos residuais fora desta migração; a proteção direta do
  bucket não corrige a autorização geral do aplicativo.
- Sessões protegidas aplicadas; API `prontuario-fotos` publicada e verificada
  com resposta 401 para requisição sem sessão.
