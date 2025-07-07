// netlify/functions/send-email.ts
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import nodemailer from "nodemailer";

// Função auxiliar para sanitizar texto para HTML
function sanitizeHTML(text: string | undefined | null): string {
  if (text === undefined || text === null) {
    return '';
  }
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Interface para o payload esperado (ajuste conforme necessário)
interface EmailPayload {
  action: string;
  dadosDetalhados: any[]; // Você pode criar tipos mais específicos para os itens em dadosDetalhados
}

// Interface para a estrutura de dados agrupada para cobrança de UAs (exemplo)
interface UasPorDocente {
  [nomeDocente: string]: {
    email: string;
    disciplinas: Set<string>; // Usando Set para evitar disciplinas duplicadas
  };
}

// Interface para a estrutura de dados agrupada para notificar docentes (exemplo)
interface PendenciasPorDocente {
  [nomeDocente: string]: {
    email: string;
    atividades: any[]; // Detalhes das atividades pendentes
  };
}

// Interface para a estrutura de dados agrupada para notificar coordenadores (exemplo)
interface PendenciasPorCoordenador {
  [emailCoordenador: string]: {
    nome: string;
    cursos: {
      [nomeCurso: string]: {
        [nomeDocente: string]: any[]; // Detalhes das atividades pendentes por docente
      };
    };
  };
}


// --- AJUSTE AS CHAVES DE COLUNAS AQUI ---
// Estas chaves devem corresponder EXATAMENTE às chaves dos objetos em 'dadosDetalhados'
const COLUNAS = {
  DOCENTE: 'Docente', 
  EMAIL_DOCENTE: 'email_docente',
  COORDENADOR: 'Coordenador', 
  EMAIL_COORDENADOR: 'email_coordenador',
  DISCIPLINA: 'Disciplina',
  ATIVIDADE: 'Atividade', // Ou a chave correspondente à descrição da UA/atividade
  STATUS_CALCULADO: 'statusCalculado',
  IS_PENDENTE: 'isPendente', // Chave que indica se a atividade está pendente
  CURSO: 'Curso'
};

// Função auxiliar para enviar e-mail
async function sendEmailWithNodemailer(to: string, subject: string, htmlBody: string, senderEmail: string, appPassword: string, cc?: string | string[]) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: senderEmail,
    to: to, 
    subject: subject,
    html: htmlBody,
  };

  if (cc && cc.length > 0) { // Adicionado verificação para cc não ser vazio
    mailOptions.cc = cc;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}` + (mailOptions.cc ? ` and CC to ${Array.isArray(mailOptions.cc) ? mailOptions.cc.join(', ') : mailOptions.cc}` : ""));
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

// Função auxiliar para obter e-mails de Cc das variáveis de ambiente
function getCcEmails(envVarName: string): string[] | undefined {
  const ccEmailsString = process.env[envVarName];
  if (ccEmailsString && ccEmailsString.trim() !== "") {
    return ccEmailsString.split(',').map(email => email.trim());
  }
  return undefined;
}

// Lógica para 'cobrarUasPendentes'
async function handleCobrarUas(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`[handleCobrarUas] Iniciando. Total de itens recebidos: ${dados.length}`);
  
  const ccEmails = getCcEmails("TEST_CC_COBRANCA_UAS_EMAILS");
  if (ccEmails) {
    console.log(`[handleCobrarUas] E-mails para Cc (Cobrança UAs): ${ccEmails.join(', ')}`);
  } else {
    console.log("[handleCobrarUas] Nenhuma variável de ambiente TEST_CC_COBRANCA_UAS_EMAILS configurada para Cc.");
  }

  if (dados.length === 0) {
    console.log("[handleCobrarUas] Nenhum dado recebido para processar.");
    return "Nenhum dado recebido para processar cobrança de UAs.";
  }

  const uasPendentesRaw = dados.filter(item => {
    const atividadeMatch = item[COLUNAS.ATIVIDADE] === "UA'S";
    const pendenteMatch = item[COLUNAS.IS_PENDENTE] === true;
    return atividadeMatch && pendenteMatch;
  });
  console.log(`[handleCobrarUas] Número de itens filtrados como UA'S pendentes: ${uasPendentesRaw.length}`);

  if (uasPendentesRaw.length === 0) {
    console.log("[handleCobrarUas] Nenhum item 'UA\\'S' pendente encontrado após o filtro inicial.");
    return "Nenhuma UA pendente encontrada para cobrança.";
  }

  const uasPorDocente: UasPorDocente = {};
  for (const item of uasPendentesRaw) {
    const nomeDocente = sanitizeHTML(item[COLUNAS.DOCENTE]);
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE]; // Email não precisa de sanitização HTML
    const disciplina = sanitizeHTML(item[COLUNAS.DISCIPLINA]);

    if (!nomeDocente || !emailDocente || !disciplina) {
      console.log(`[handleCobrarUas] Item de UA ignorado por dados ausentes (docente, email ou disciplina): ${JSON.stringify(item)}`);
      continue;
    }
    // Use nomeDocente original (não sanitizado) como chave se necessário manter consistência com dados originais,
    // mas para exibição no email, use a versão sanitizada.
    // Para este caso, como nomeDocente é usado como chave e depois no corpo do email, vamos usar o original para a chave
    // e sanitizar na hora de construir o corpo do email.
    const originalNomeDocente = item[COLUNAS.DOCENTE]; 
    if (!originalNomeDocente) continue; // Garantir que o original exista

    if (!uasPorDocente[originalNomeDocente]) {
      uasPorDocente[originalNomeDocente] = { email: emailDocente, disciplinas: new Set<string>() };
    }
    uasPorDocente[originalNomeDocente].disciplinas.add(item[COLUNAS.DISCIPLINA]); // Adiciona disciplina original
  }

  let docentesCobrados = 0;
  const totalDocentesParaCobrar = Object.keys(uasPorDocente).length;
  console.log(`[handleCobrarUas] Total de docentes únicos para cobrar UAs: ${totalDocentesParaCobrar}`);

  if (totalDocentesParaCobrar === 0) {
    console.log("[handleCobrarUas] Nenhum docente agrupado para cobrança de UAs (após processar itens pendentes).");
    return "Nenhum docente encontrado com UAs pendentes para cobrança.";
  }

  for (const originalNomeDocente in uasPorDocente) {
    const info = uasPorDocente[originalNomeDocente];
    const nomeDocenteSanitized = sanitizeHTML(originalNomeDocente); // Sanitiza para exibição
    console.log(`[handleCobrarUas] Preparando e-mail para docente: ${nomeDocenteSanitized}, Email: ${info.email}, Disciplinas: ${Array.from(info.disciplinas)}`);
    if (info.disciplinas.size === 0) {
      continue;
    }

    const listaDisciplinasHtml = `<ul>${Array.from(info.disciplinas).sort().map(d => `<li>${sanitizeHTML(d)}</li>`).join('')}</ul>`;
    console.log(`[handleCobrarUas] Lista de disciplinas HTML para ${nomeDocenteSanitized}: ${listaDisciplinasHtml}`);
    const corpoHtml = 
      `<p>Olá, Professor(a) ${nomeDocenteSanitized}, tudo bem?</p>
       <p>Sabemos que o dia a dia é sempre uma correria e, para te ajudar a organizar, estamos passando para verificar o andamento do envio do material das UAs (Unidades de Aprendizagem).</p>
       <p>Para que possamos preparar o Ambiente Virtual de Aprendizagem para os alunos, <strong>estamos aguardando o material das seguintes disciplinas:</strong></p>
       ${listaDisciplinasHtml}
       <p>Assim que tiver uma previsão ou puder nos enviar o material, ficaremos muito gratos. Isso nos ajuda a garantir que tudo esteja pronto para os estudantes.</p>
       <p>Se precisar de qualquer ajuda, é só nos chamar!</p>
       <p>Um abraço,<br>Equipe NED</p>`;
    
    console.log(`[handleCobrarUas] Corpo do e-mail para ${nomeDocenteSanitized}:\n${corpoHtml}`);
    console.log(`[handleCobrarUas] Tamanho estimado do corpo HTML para ${nomeDocenteSanitized}: ${corpoHtml.length} caracteres.`);
    if (await sendEmailWithNodemailer(info.email, "Sobre o envio do material (UAs)", corpoHtml, senderEmail, appPassword, ccEmails)) {
      docentesCobrados++;
    }
  }

  console.log(`[handleCobrarUas] Finalizado. Docentes cobrados: ${docentesCobrados} de ${Object.keys(uasPorDocente).length}`);
  if (docentesCobrados === 0 && Object.keys(uasPorDocente).length > 0) {
    return `Falha ao cobrar ${Object.keys(uasPorDocente).length} docente(s) sobre UAs pendentes. Verifique os logs.`;
  }
  return `${docentesCobrados}/${Object.keys(uasPorDocente).length} docente(s) notificados sobre UAs pendentes.`;
}

async function handleNotificarDocentes(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`[handleNotificarDocentes] Iniciando notificação de docentes com ${dados.length} itens.`);
  const ccEmails = getCcEmails("TEST_CC_NOTIFICACAO_GERAL_EMAILS");
  if (ccEmails) {
    console.log(`[handleNotificarDocentes] E-mails para Cc (Notificação Docentes): ${ccEmails.join(', ')}`);
  } else {
    console.log("[handleNotificarDocentes] Nenhuma variável de ambiente TEST_CC_NOTIFICACAO_GERAL_EMAILS configurada para Cc.");
  }
  
  const pendenciasPorDocente: PendenciasPorDocente = {};

  for (const item of dados) {
    const originalNomeDocente = item[COLUNAS.DOCENTE];
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE]; // Email não precisa de sanitização
    if (!originalNomeDocente || !emailDocente) {
      console.log(`[handleNotificarDocentes] Item ignorado por falta de nome/email: ${JSON.stringify(item)}`);
      continue;
    }
    if (!pendenciasPorDocente[originalNomeDocente]) {
      pendenciasPorDocente[originalNomeDocente] = { email: emailDocente, atividades: [] };
    }
    if (item[COLUNAS.IS_PENDENTE] === true) {
      pendenciasPorDocente[originalNomeDocente].atividades.push(item);
    }
  }

  let docentesNotificados = 0;
  const totalDocentesAgrupados = Object.keys(pendenciasPorDocente).length;
  console.log(`[handleNotificarDocentes] Total de docentes para notificar: ${totalDocentesAgrupados}`);

  for (const originalNomeDocente in pendenciasPorDocente) {
    const info = pendenciasPorDocente[originalNomeDocente];
    const nomeDocenteSanitized = sanitizeHTML(originalNomeDocente);

    if (info.atividades.length > 0) {
      let atividadesHtml = "";
      info.atividades.forEach(item => {
        atividadesHtml += 
          `<p>
            <b>› Disciplina:</b> ${sanitizeHTML(item[COLUNAS.DISCIPLINA])}<br>
            &nbsp;&nbsp;- Atividade: ${sanitizeHTML(item[COLUNAS.ATIVIDADE])}<br>
            &nbsp;&nbsp;- Situação: ${sanitizeHTML(item[COLUNAS.STATUS_CALCULADO])}
          </p>`;
      });

      const corpoHtml = 
        `<p>Prezado(a) Professor(a) ${nomeDocenteSanitized},</p>
         <p>Com o objetivo de manter a organização e o bom andamento das disciplinas, enviamos abaixo um resumo de suas atividades com pendências em nosso sistema.</p>
         <p>Segue o detalhamento:</p>
         ${atividadesHtml}
         <p>A sua atenção a estes pontos é importante para o acompanhamento dos alunos. Agradecemos a sua colaboração para regularizar a situação.</p>
         <p>Caso já tenha realizado os ajustes, por favor, desconsidere esta notificação.</p>
         <p>Atenciosamente,<br>Equipe NED</p>`;
      
      console.log(`[handleNotificarDocentes] Tamanho estimado do corpo HTML para ${nomeDocenteSanitized}: ${corpoHtml.length} caracteres.`);
      if (await sendEmailWithNodemailer(info.email, "Notificação de Pendências em Atividades Acadêmicas", corpoHtml, senderEmail, appPassword, ccEmails)) {
        docentesNotificados++;
      }
    }
  }
  if (totalDocentesAgrupados > 0 && docentesNotificados === 0 && Object.values(pendenciasPorDocente).some(doc => doc.atividades.length > 0) ) {
    return `Falha ao notificar ${totalDocentesAgrupados} docente(s) com pendências. Verifique os logs.`;
  }
  return `${docentesNotificados}/${totalDocentesAgrupados} docente(s) notificados sobre pendências.`;
}

async function handleNotificarCoordenadores(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`[handleNotificarCoordenadores] Iniciando notificação de coordenadores com ${dados.length} itens.`);
  const ccEmails = getCcEmails("TEST_CC_NOTIFICACAO_GERAL_EMAILS");
  if (ccEmails) {
    console.log(`[handleNotificarCoordenadores] E-mails para Cc (Notificação Coordenadores): ${ccEmails.join(', ')}`);
  } else {
    console.log("[handleNotificarCoordenadores] Nenhuma variável de ambiente TEST_CC_NOTIFICACAO_GERAL_EMAILS configurada para Cc.");
  }

  const pendenciasPorCoordenador: PendenciasPorCoordenador = {};

  for (const item of dados) {
    const originalNomeCoordenador = item[COLUNAS.COORDENADOR];
    const emailCoordenador = item[COLUNAS.EMAIL_COORDENADOR]; // Email não sanitizado
    const originalNomeCurso = item[COLUNAS.CURSO];
    const originalNomeDocente = item[COLUNAS.DOCENTE];

    if (!originalNomeCoordenador || !emailCoordenador || !originalNomeCurso || !originalNomeDocente) {
      console.log(`[handleNotificarCoordenadores] Item ignorado por falta de dados: ${JSON.stringify(item)}`);
      continue;
    }

    if (!pendenciasPorCoordenador[emailCoordenador]) {
      // Usar nome original para a chave, sanitizar para exibição
      pendenciasPorCoordenador[emailCoordenador] = { nome: originalNomeCoordenador, cursos: {} };
    }
    if (!pendenciasPorCoordenador[emailCoordenador].cursos[originalNomeCurso]) {
      pendenciasPorCoordenador[emailCoordenador].cursos[originalNomeCurso] = {};
    }
    if (!pendenciasPorCoordenador[emailCoordenador].cursos[originalNomeCurso][originalNomeDocente]) {
      pendenciasPorCoordenador[emailCoordenador].cursos[originalNomeCurso][originalNomeDocente] = [];
    }
    if (item[COLUNAS.IS_PENDENTE] === true) {
      pendenciasPorCoordenador[emailCoordenador].cursos[originalNomeCurso][originalNomeDocente].push(item);
    }
  }
  
  let coordenadoresNotificados = 0;
  const totalCoordenadoresAgrupados = Object.keys(pendenciasPorCoordenador).length;
  console.log(`[handleNotificarCoordenadores] Total de coordenadores para notificar: ${totalCoordenadoresAgrupados}`);

  for (const emailCoordenador in pendenciasPorCoordenador) {
    const infoCoordenador = pendenciasPorCoordenador[emailCoordenador];
    const nomeCoordenadorSanitized = sanitizeHTML(infoCoordenador.nome);
    let corpoEmailHtmlParcial = ""; 
    let existemPendenciasParaEsteCoordenador = false;

    for (const originalNomeCurso in infoCoordenador.cursos) {
      const nomeCursoSanitized = sanitizeHTML(originalNomeCurso);
      let corpoCursoHtml = "";
      let existemPendenciasNesteCurso = false;
      const docentesDoCurso = infoCoordenador.cursos[originalNomeCurso];

      for (const originalNomeDocente in docentesDoCurso) {
        const nomeDocenteSanitized = sanitizeHTML(originalNomeDocente);
        const atividadesDoDocente = docentesDoCurso[originalNomeDocente];
        if (atividadesDoDocente.length > 0) { 
          if (!existemPendenciasNesteCurso) { 
            corpoCursoHtml += `<hr><p><b>RESUMO DO CURSO: ${nomeCursoSanitized}</b></p>`;
            existemPendenciasNesteCurso = true;
            existemPendenciasParaEsteCoordenador = true;
          }
          corpoCursoHtml += `<p><b>&nbsp;&nbsp;• Docente:</b> ${nomeDocenteSanitized}</p>`;
          atividadesDoDocente.forEach(item => {
            corpoCursoHtml += 
              `<p>
                &nbsp;&nbsp;&nbsp;&nbsp;- Disciplina: ${sanitizeHTML(item[COLUNAS.DISCIPLINA])}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- Item pendente: ${sanitizeHTML(item[COLUNAS.ATIVIDADE])}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- Situação: ${sanitizeHTML(item[COLUNAS.STATUS_CALCULADO])}
              </p>`;
          });
        }
      }
      if (existemPendenciasNesteCurso) {
        corpoEmailHtmlParcial += corpoCursoHtml;
      }
    }

    if (existemPendenciasParaEsteCoordenador) {
      const cabecalhoEmail = 
        `<p>Olá, Coordenador(a) ${nomeCoordenadorSanitized}, tudo bem?</p>
         <p>Para te auxiliar no acompanhamento acadêmico, preparamos um resumo dos pontos que merecem atenção em seus cursos esta semana.</p>`;
      const rodapeEmail =
        `<hr><p>Agradecemos se puder conversar com os docentes para entender e auxiliar na regularização das pendências.</p>
         <p>Qualquer apoio que precisar de nossa parte, é só chamar.</p>
         <p>Um abraço,<br>Equipe NED</p>`;
      
      const corpoEmailCompleto = cabecalhoEmail + corpoEmailHtmlParcial + rodapeEmail;

      // Log do tamanho do HTML antes de enviar
      console.log(`[handleNotificarCoordenadores] Email para ${emailCoordenador} (${nomeCoordenadorSanitized}). Tamanho estimado do corpo HTML: ${corpoEmailCompleto.length} caracteres.`);
      
      if (await sendEmailWithNodemailer(emailCoordenador, "Acompanhamento de pendências dos cursos", corpoEmailCompleto, senderEmail, appPassword, ccEmails)) {
        coordenadoresNotificados++;
      }
    }
  }
  if (totalCoordenadoresAgrupados > 0 && coordenadoresNotificados === 0 && Object.values(pendenciasPorCoordenador).some(coord => Object.values(coord.cursos).some(curso => Object.values(curso).some(docente => docente.length > 0)) ) ) {
    return `Falha ao notificar ${totalCoordenadoresAgrupados} coordenador(es) com pendências. Verifique os logs.`;
  }
  return `${coordenadoresNotificados}/${totalCoordenadoresAgrupados} coordenador(es) notificados sobre pendências.`;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({error: "Method Not Allowed"}) };
  }

  const { SENDER_EMAIL, EMAIL_APP_PASSWORD } = process.env;

  if (!SENDER_EMAIL || !EMAIL_APP_PASSWORD) {
    console.error("Credenciais de e-mail (SENDER_EMAIL ou EMAIL_APP_PASSWORD) não configuradas no ambiente.");
    return { statusCode: 500, body: JSON.stringify({ error: "Erro de configuração do servidor: credenciais de e-mail ausentes." }) };
  }

  try {
    const payload: EmailPayload = JSON.parse(event.body || "{}");
    console.log("Payload recebido:", payload);
    const { action, dadosDetalhados } = payload;

    if (!action) {
      return { statusCode: 400, body: JSON.stringify({ error: "A propriedade 'action' é obrigatória no payload." }) };
    }
    console.log(`Ação solicitada: ${action}`);
    let responseMessage = "";

    switch (action) {
      case 'cobrancaUas':
        responseMessage = await handleCobrarUas(dadosDetalhados, SENDER_EMAIL, EMAIL_APP_PASSWORD);
        break;
      case 'docentes':
        responseMessage = await handleNotificarDocentes(dadosDetalhados, SENDER_EMAIL, EMAIL_APP_PASSWORD);
        break;
      case 'coordenadores':
        responseMessage = await handleNotificarCoordenadores(dadosDetalhados, SENDER_EMAIL, EMAIL_APP_PASSWORD);
        break;
      default:
        console.log(`Ação não reconhecida: ${action}`);
        return { statusCode: 400, body: JSON.stringify({ error: `Ação "${action}" não reconhecida.` }) };
    }
    
    console.log(`Ação '${action}' processada. Mensagem: ${responseMessage}`);
    return { statusCode: 200, body: JSON.stringify({ message: responseMessage }) };

  } catch (error) {
    console.error("Erro na função handler:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido";
    return { statusCode: 500, body: JSON.stringify({ error: `Erro interno no servidor: ${errorMessage}` }) };
  }
};

export { handler };