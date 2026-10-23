# Plano de testes: Find Your Beauty

**Prioridade:** 🔴 Alta · 🟡 Média · 🟢 Baixa. Testar em **celular (390 px)**, **tablet (768 px)** e **desktop (≥ 1024 px)**, no Chrome e no Safari do iPhone.

Marque cada linha ao executar (coluna "OK"). Registre o que falhar com a tela, o passo e o que apareceu.

## 1. Cadastro e login do cliente

| OK | Pri. | O que testar | Passo a passo rápido | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Cadastro completo com verificação | `/cadastro`, preencher tudo (CPF válido, endereço escolhido na lista), enviar, digitar o código recebido | Vai para a tela do código, o e-mail chega, o código certo entra logado e a boas-vindas chega só depois |
| ☐ | 🔴 | Código errado, expirado e reenvio | Digitar código errado 5 vezes; esperar 10 min; clicar em reenviar antes e depois de 1 min | "Código incorreto"; depois bloqueia e pede novo código; reenvio só libera após o contador |
| ☐ | 🔴 | Login sem verificar o e-mail | Criar conta, fechar a página, tentar entrar | Volta à tela do código com código novo, sem entrar |
| ☐ | 🔴 | Área trocada | Cliente em `/pro/entrar` e profissional em `/entrar` | Erro dizendo que a conta é do outro tipo |
| ☐ | 🔴 | Regras de campo | CPF inválido (`111.111.111-11`), senha sem especial, celular incompleto, endereço digitado sem escolher sugestão | Cada erro aparece no campo e o cadastro não envia |
| ☐ | 🟡 | Google | "Entrar com Google" como cliente novo e como profissional | Cliente entra; o CPF e o endereço são cobrados no perfil antes de agendar |
| ☐ | 🟡 | Esqueci a senha | Pedir redefinição, abrir o link, trocar a senha | E-mail com a marca chega, o link abre a tela de nova senha e o login funciona com ela |
| ☐ | 🟡 | "Lembrar de mim" | Entrar sem marcar, fechar e abrir o navegador | Sessão não persiste; com a opção marcada, persiste |
| ☐ | 🟢 | "Continuar como visitante" | Tocar em `/entrar` e nas boas-vindas | Vai para a home sem login |

## 2. Visitante

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Agendar sem login | Escolher serviço, tocar em agendar; abrir direto `/profissionais/:id/agendar` | Vai para o login nos dois casos |
| ☐ | 🟡 | Telas protegidas | Abrir `/agenda`, `/perfil`, `/mensagens` | Aviso "Você não está logado" com botão Entrar |
| ☐ | 🟡 | Coração | Ver home, mapa e página do profissional | Nenhum coração aparece |
| ☐ | 🟡 | Rota de admin | Abrir `/admin` sem permissão | Volta para a home |

## 3. Busca, mapa e descoberta

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Busca por texto | Buscar nome, serviço, bairro; sem resultado | Resultados corretos; "0 resultados" com mensagem clara |
| ☐ | 🔴 | Filtros combinados | Bairro + serviço + avaliação + data + ordenar | Contador no ícone, resultados coerentes, "Redefinir" limpa |
| ☐ | 🟡 | Bairro | Abrir o filtro | Só aparecem bairros com profissional |
| ☐ | 🟡 | Mapa e cards | Tocar uma vez e depois outra num card; voltar da página | 1º toque seleciona, 2º abre; ao voltar o card segue selecionado |
| ☐ | 🟡 | Categorias | Desmarcar as duas | A última não desmarca |
| ☐ | 🟡 | Sua localização | Permitir e negar o acesso | Ponto, anel e área aparecem; sem permissão o mapa abre sem eles |
| ☐ | 🟡 | Serviços na home | Tocar num serviço | Abre a busca já preenchida |
| ☐ | 🟢 | Fotos nos cards | Passar as fotos e conferir os pontinhos | Pontinhos acompanham a foto; cada card tem o seu |

## 4. Página do profissional e agendamento

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Agendar ponta a ponta | Escolher serviços, dia e horário, finalizar | Vai para `/agenda`, o profissional é avisado por e-mail e notificação |
| ☐ | 🔴 | Preço por dia e horário | Serviço com regra para sábado; escolher sábado nesse horário e outro dia | Total muda só nos horários da regra; o horário mostra o valor; o total do servidor confere |
| ☐ | 🔴 | Dados incompletos | Cliente sem celular, CPF ou endereço | Aviso lista o que falta e o botão fica desabilitado |
| ☐ | 🔴 | Horário ocupado | Dois clientes pegam o mesmo horário quase juntos | Um recebe "horário acabou de ser ocupado" |
| ☐ | 🔴 | Duplo clique em Finalizar | Clicar rápido duas vezes | Só um agendamento é criado |
| ☐ | 🟡 | Folha do serviço | Tocar no card; puxar para baixo; Esc; fundo escuro | Abre, puxar/Esc/fundo fecham, "+" não abre a folha |
| ☐ | 🟡 | Descrição longa | Serviço com texto longo | "Ler mais" só aparece se estiver cortado |
| ☐ | 🟡 | Dia disponível | Abrir o agendamento | Já seleciona o próximo dia livre |
| ☐ | 🟢 | Copiar endereço | Tocar no botão | Copia, mostra o toast e o check |

## 5. Agenda, favoritos, chat e avaliações

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Cancelar | Cliente cancela pendente/confirmado; profissional cancela confirmado | Horário volta a ficar livre e a outra parte recebe aviso e e-mail |
| ☐ | 🟡 | Avaliar | Avaliar após concluído; editar; excluir | Só quem concluiu avalia; nota e contagem atualizam ("1 avaliação") |
| ☐ | 🟡 | Favoritos | Favoritar e desfavoritar | Aparece em "Profissionais que você segue" na home |
| ☐ | 🟡 | Chat | Enviar texto e anexo de 10 MB e acima | Mensagem chega; arquivo acima do limite é recusado com aviso |
| ☐ | 🟢 | Notificação | Tocar numa notificação | Abre a tela certa |

## 6. Profissional

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Cadastro em dois passos | Criar conta, completar o perfil, enviar | Mensagem "em análise"; não consegue entrar até a aprovação |
| ☐ | 🔴 | Aprovação e negação | Admin aprova; outro profissional é negado | Aprovado fica público na hora e recebe e-mail; negado reabre o cadastro preenchido |
| ☐ | 🔴 | Autosave | Editar campos, sair de cada um; bloquear período; mexer com horário inválido | Toast "Alterações salvas"; recarregar mantém; dado inválido não é gravado |
| ☐ | 🔴 | Serviços | Categoria → nome (dropdown), preço, duração, regras de preço, fotos | Nome só habilita após a categoria; regra incompleta mostra erro |
| ☐ | 🟡 | Onde atende | Só endereço / só domicílio / os dois | Endereço só é cobrado quando há "No meu endereço"; só domicílio sai do mapa |
| ☐ | 🟡 | Aviso do que falta | Cadastro incompleto | Balão flutuante lista o que falta, some em 5 s ou ao tocar |
| ☐ | 🟡 | Fotos | Enviar várias fotos e remover | Spinner no envio; arquivo some do armazenamento no salvar |
| ☐ | 🟢 | Instagram | Procurar a seção | Desligada por enquanto, sem botão |

## 7. Responsividade e UX

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Mobile intacto | Abrir todas as telas em 390 px | Mesmo visual de antes, abas embaixo |
| ☐ | 🔴 | Desktop | 1024, 1280 e 1440 px | Barra no topo, sem abas embaixo; sem rolagem horizontal; nada estoura |
| ☐ | 🟡 | Tablet | 768 px | Layout de celular |
| ☐ | 🟡 | Rotação do celular | Girar na página do profissional e no agendamento | Sem sobreposição das barras fixas |
| ☐ | 🟡 | Teclado no celular | Abrir o teclado em formulários longos | Campo focado não fica escondido |
| ☐ | 🟡 | Acessibilidade | Navegar só com Tab; leitor de tela | Foco visível, botões de ícone com nome (`aria-label`) |
| ☐ | 🟢 | Movimento reduzido | Ativar "reduzir movimento" | Animações de sheet e toasts desligam |

## 8. Casos de borda e permissões

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | Rotas sem permissão | Cliente em `/pro`; profissional em `/agendar`; não-admin em `/admin` | Redirecionados, sem erro |
| ☐ | 🔴 | Dados de outro usuário | Tentar ler `users/{outro}` ou o CPF de um profissional pelo Firestore | Negado pelas regras |
| ☐ | 🟡 | Sem internet | Abrir o app e agendar offline | Casca abre (PWA); ações mostram erro claro, sem travar |
| ☐ | 🟡 | Voltar do navegador | Voltar com a folha do serviço aberta | Volta da página (a folha não fecha sozinha) |
| ☐ | 🟡 | Link velho | `/maquiadores/...` | Cai na home (não há redirecionamento) |
| ☐ | 🟢 | Entrada estranha | Textos enormes, emojis, espaços só | Sem quebrar layout; campos obrigatórios rejeitam vazio |

## 9. E-mail e PWA

| OK | Pri. | O que testar | Passo a passo | Resultado esperado |
|---|---|---|---|---|
| ☐ | 🔴 | E-mails chegam | Disparar cada um (pedido, confirmação, cancelamento, aprovação, código, senha) | Chegam sem cair no spam, com logo, texto certo e botão que abre o site |
| ☐ | 🟡 | Instalar | Android: "Instalar app"; iPhone: Compartilhar > Tela de Início | Ícone do pin, abre em tela cheia |
| ☐ | 🟡 | Atualização | Publicar nova versão e reabrir o app instalado | Passa a usar a versão nova |

## Riscos conhecidos (testar primeiro)

1. **Chave do Google Maps:** só funcionou em `localhost:4200`; no site publicado, confira o domínio nos referenciadores. Sem isso o mapa e a busca de endereço falham.
2. **Domínio autorizado no Firebase:** necessário para o login com Google no site.
3. **Telas com login** (agendamento, perfil, mensagens, área do profissional, admin): o layout web foi só revisado no CSS, não visto na tela.
4. **Mensagens no desktop** continuam em duas telas separadas, não lado a lado.
5. **Conta do Resend:** se o domínio perder a verificação, os cadastros de cliente ficam presos na tela do código.
