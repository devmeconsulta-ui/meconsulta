# Agenda de Exames

Uma agenda separada da de consultas, organizada por médico, reaproveitando horários, confirmação por WhatsApp e financeiro que já existem.

## O que a clínica vai ver

1. **Cadastro de exames** (novo item "Exames" no menu da Clínica)
   - Já vem com: Holter, MAPA, ECG, Espirometria, Impedanciometria.
   - Cada exame tem nome, duração, valor, se está ativo e um campo **Preparo**. A atendente escreve e edita esse texto (por exemplo, o preparo da Espirometria).
   - Para cada exame, a clínica escolhe quais médicos fazem esse exame.

2. **Agenda de Exames** (novo item no menu, ao lado de "Agenda")
   - Mesma cara da agenda atual: escolhe o médico e o dia e vê os horários.
   - Cada horário mostra o nome do exame, com uma cor diferente para cada exame, o paciente e o status (agendado, confirmado, realizado, faltou, cancelado).
   - Botão "Gerar Horários" por médico e exame, com as mesmas permissões de hoje: médico, dono da clínica, secretária e atendente.
   - Marcar exame: escolhe o paciente, o exame e o horário. O preparo aparece na tela para a atendente conferir.

3. **Preparo enviado ao paciente**
   - Na confirmação por WhatsApp, o texto do preparo vai junto quando o exame tiver um.
   - Na tela de Confirmação de Agenda, os exames aparecem junto com as consultas, com a marcação "Exame".

4. **Médico**
   - Em `/medico/agenda` aparece uma aba "Exames" com os exames marcados para ele.

5. **Financeiro**
   - Um exame marcado como pago entra no financeiro da clínica do mesmo jeito que uma consulta.

## Detalhes técnicos

- Novas tabelas `exames_tipos` (clinica_id, nome, duracao_min, valor, preparo, cor, ativo) e `exames_medicos` (exame_tipo_id, medico_id), com GRANTs e RLS no mesmo padrão permissivo de `caixa_*` (a autenticação é própria do sistema). Os 5 exames entram como seed para cada clínica ao abrir a tela pela primeira vez.
- Reaproveita as tabelas atuais: `agenda_slots.tipo_slot = 'exame'` + nova coluna `exame_tipo_id`, e `consultas.exame_tipo_id` (nula para consultas). Assim a confirmação, o realtime, a sincronização com o caixa e a ordem de chegada continuam funcionando sem duplicar lógica.
- A Agenda de Consultas atual passa a filtrar `exame_tipo_id IS NULL` para não misturar as duas.
- `send-confirmation-batch` e `notify-appointment-booked` (Evolution) incluem o preparo quando existir.
- Novas páginas: `ClinicaExames.tsx` (cadastro) e `ClinicaAgendaExames.tsx`, com rotas em `App.tsx` e itens no `ClinicaSidebar`. Datas sempre com `parseISO`.
