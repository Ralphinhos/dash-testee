// netlify/functions/send-email.ts
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import nodemailer from "nodemailer";

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
    const nomeDocente = item[COLUNAS.DOCENTE];
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE];
    const disciplina = item[COLUNAS.DISCIPLINA];

    if (!nomeDocente || !emailDocente || !disciplina) {
      console.log(`[handleCobrarUas] Item de UA ignorado por dados ausentes (docente, email ou disciplina): ${JSON.stringify(item)}`);
      continue;
    }
    if (!uasPorDocente[nomeDocente]) {
      uasPorDocente[nomeDocente] = { email: emailDocente, disciplinas: new Set<string>() };
    }
    uasPorDocente[nomeDocente].disciplinas.add(disciplina);
  }

  let docentesCobrados = 0;
  const totalDocentesParaCobrar = Object.keys(uasPorDocente).length;
  console.log(`[handleCobrarUas] Total de docentes únicos para cobrar UAs: ${totalDocentesParaCobrar}`);

  if (totalDocentesParaCobrar === 0) {
    console.log("[handleCobrarUas] Nenhum docente agrupado para cobrança de UAs (após processar itens pendentes).");
    return "Nenhum docente encontrado com UAs pendentes para cobrança.";
  }

  for (const nomeDocente in uasPorDocente) {
    const info = uasPorDocente[nomeDocente];
    console.log(`[handleCobrarUas] Preparando e-mail para docente: ${nomeDocente}, Email: ${info.email}, Disciplinas: ${Array.from(info.disciplinas)}`);
    if (info.disciplinas.size === 0) {
      continue;
    }

    const listaDisciplinasHtml = `<ul>${Array.from(info.disciplinas).sort().map(d => `<li>${d}</li>`).join('')}</ul>`;
    console.log(`[handleCobrarUas] Lista de disciplinas HTML para ${nomeDocente}: ${listaDisciplinasHtml}`);
    const corpoHtml = 
      `<p>Olá, Professor(a) ${nomeDocente}, tudo bem?</p>
       <p>Sabemos que o dia a dia é sempre uma correria e, para te ajudar a organizar, estamos passando para verificar o andamento do envio do material das UAs (Unidades de Aprendizagem).</p>
       <p>Para que possamos preparar o Ambiente Virtual de Aprendizagem para os alunos, <strong>estamos aguardando o material das seguintes disciplinas:</strong></p>
       ${listaDisciplinasHtml}
       <p>Assim que tiver uma previsão ou puder nos enviar o material, ficaremos muito gratos. Isso nos ajuda a garantir que tudo esteja pronto para os estudantes.</p>
       <p>Se precisar de qualquer ajuda, é só nos chamar!</p>
       <p>Um abraço,<br>Equipe NED</p>`;
    
    console.log(`[handleCobrarUas] Corpo do e-mail para ${nomeDocente}:\n${corpoHtml}`);
    if (await sendEmailWithNodemailer(info.email, "Sobre o envio do material (UAs)", corpoHtml, senderEmail, appPassword, ccEmails)) {
      docentesCobrados++;
    }
  }

  console.log(`[handleCobrarUas] Finalizado. Docentes cobrados: ${docentesCobrados} de ${totalDocentesParaCobrar}`);
  if (docentesCobrados === 0 && totalDocentesParaCobrar > 0) {
    return `Falha ao cobrar ${totalDocentesParaCobrar} docente(s) sobre UAs pendentes. Verifique os logs.`;
  }
  return `${docentesCobrados}/${totalDocentesParaCobrar} docente(s) notificados sobre UAs pendentes.`;
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
    const nomeDocente = item[COLUNAS.DOCENTE];
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE];
    if (!nomeDocente || !emailDocente) {
      console.log(`[handleNotificarDocentes] Item ignorado por falta de nome/email: ${JSON.stringify(item)}`);
      continue;
    }
    if (!pendenciasPorDocente[nomeDocente]) {
      pendenciasPorDocente[nomeDocente] = { email: emailDocente, atividades: [] };
    }
    if (item[COLUNAS.IS_PENDENTE] === true) {
      pendenciasPorDocente[nomeDocente].atividades.push(item);
    }
  }

  let docentesNotificados = 0;
  const totalDocentes = Object.keys(pendenciasPorDocente).length;
  console.log(`[handleNotificarDocentes] Total de docentes para notificar: ${totalDocentes}`);

  for (const nomeDocente in pendenciasPorDocente) {
    const info = pendenciasPorDocente[nomeDocente];
    if (info.atividades.length > 0) {
      let atividadesHtml = "";
      info.atividades.forEach(item => {
        atividadesHtml += 
          `<p>
            <b>› Disciplina:</b> ${item[COLUNAS.DISCIPLINA]}<br>
            &nbsp;&nbsp;- Atividade: ${item[COLUNAS.ATIVIDADE]}<br>
            &nbsp;&nbsp;- Situação: ${item[COLUNAS.STATUS_CALCULADO]}
          </p>`;
      });

      const corpoHtml = 
        `<p>Prezado(a) Professor(a) ${nomeDocente},</p>
         <p>Com o objetivo de manter a organização e o bom andamento das disciplinas, enviamos abaixo um resumo de suas atividades com pendências em nosso sistema.</p>
         <p>Segue o detalhamento:</p>
         ${atividadesHtml}
         <p>A sua atenção a estes pontos é importante para o acompanhamento dos alunos. Agradecemos a sua colaboração para regularizar a situação.</p>
         <p>Caso já tenha realizado os ajustes, por favor, desconsidere esta notificação.</p>
         <p>Atenciosamente,<br>Equipe NED</p>`;

      if (await sendEmailWithNodemailer(info.email, "Notificação de Pendências em Atividades Acadêmicas", corpoHtml, senderEmail, appPassword, ccEmails)) {
        docentesNotificados++;
      }
    }
  }
  if (totalDocentes > 0 && docentesNotificados === 0 && Object.keys(pendenciasPorDocente).some(docente => pendenciasPorDocente[docente].atividades.length > 0) ) {
    return `Falha ao notificar ${totalDocentes} docente(s) com pendências. Verifique os logs.`;
  }
  return `${docentesNotificados}/${totalDocentes} docente(s) notificados sobre pendências.`;
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
    const nomeCoordenador = item[COLUNAS.COORDENADOR];
    const emailCoordenador = item[COLUNAS.EMAIL_COORDENADOR];
    const nomeCurso = item[COLUNAS.CURSO];
    const nomeDocente = item[COLUNAS.DOCENTE];

    if (!nomeCoordenador || !emailCoordenador || !nomeCurso || !nomeDocente) {
      console.log(`[handleNotificarCoordenadores] Item ignorado por falta de dados: ${JSON.stringify(item)}`);
      continue;
    }

    if (!pendenciasPorCoordenador[emailCoordenador]) {
      pendenciasPorCoordenador[emailCoordenador] = { nome: nomeCoordenador, cursos: {} };
    }
    if (!pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso]) {
      pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso] = {};
    }
    if (!pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso][nomeDocente]) {
      pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso][nomeDocente] = [];
    }
    if (item[COLUNAS.IS_PENDENTE] === true) {
      pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso][nomeDocente].push(item);
    }
  }
  
  let coordenadoresNotificados = 0;
  const totalCoordenadores = Object.keys(pendenciasPorCoordenador).length;
  console.log(`[handleNotificarCoordenadores] Total de coordenadores para notificar: ${totalCoordenadores}`);

  for (const emailCoordenador in pendenciasPorCoordenador) {
    const infoCoordenador = pendenciasPorCoordenador[emailCoordenador];
    let corpoEmailHtmlParcial = ""; 
    let existemPendenciasParaEsteCoordenador = false;

    for (const nomeCurso in infoCoordenador.cursos) {
      let corpoCursoHtml = "";
      let existemPendenciasNesteCurso = false;
      const docentesDoCurso = infoCoordenador.cursos[nomeCurso];

      for (const nomeDocente in docentesDoCurso) {
        const atividadesDoDocente = docentesDoCurso[nomeDocente];
        if (atividadesDoDocente.length > 0) { 
          if (!existemPendenciasNesteCurso) { 
            corpoCursoHtml += `<hr><p><b>RESUMO DO CURSO: ${nomeCurso}</b></p>`;
            existemPendenciasNesteCurso = true;
            existemPendenciasParaEsteCoordenador = true;
          }
          corpoCursoHtml += `<p><b>&nbsp;&nbsp;• Docente:</b> ${nomeDocente}</p>`;
          atividadesDoDocente.forEach(item => {
            corpoCursoHtml += 
              `<p>
                &nbsp;&nbsp;&nbsp;&nbsp;- Disciplina: ${item[COLUNAS.DISCIPLINA]}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- Item pendente: ${item[COLUNAS.ATIVIDADE]}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;- Situação: ${item[COLUNAS.STATUS_CALCULADO]}
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
        `<p>Olá, Coordenador(a) ${infoCoordenador.nome}, tudo bem?</p>
         <p>Para te auxiliar no acompanhamento acadêmico, preparamos um resumo dos pontos que merecem atenção em seus cursos esta semana.</p>`;
      const rodapeEmail =
        `<hr><p>Agradecemos se puder conversar com os docentes para entender e auxiliar na regularização das pendências.</p>
         <p>Qualquer apoio que precisar de nossa parte, é só chamar.</p>
         <p>Um abraço,<br>Equipe NED</p>`;
      
      const corpoEmailCompleto = cabecalhoEmail + corpoEmailHtmlParcial + rodapeEmail;
      
      if (await sendEmailWithNodemailer(emailCoordenador, "Acompanhamento de pendências dos cursos", corpoEmailCompleto, senderEmail, appPassword, ccEmails)) {
        coordenadoresNotificados++;
      }
    }
  }
  if (totalCoordenadores > 0 && coordenadoresNotificados === 0 && Object.keys(pendenciasPorCoordenador).some(coord => Object.values(pendenciasPorCoordenador[coord].cursos).some(curso => Object.values(curso).some(docente => docente.length > 0)) ) ) {
    return `Falha ao notificar ${totalCoordenadores} coordenador(es) com pendências. Verifique os logs.`;
  }
  return `${coordenadoresNotificados}/${totalCoordenadores} coordenador(es) notificados sobre pendências.`;
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