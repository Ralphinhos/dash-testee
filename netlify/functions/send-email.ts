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
  ATIVIDADE: 'Nome da Atividade', // Ou a chave correspondente à descrição da UA/atividade
  STATUS_CALCULADO: 'statusCalculado',
  IS_PENDENTE: 'isPendente', // Chave que indica se a atividade está pendente
  CURSO: 'Curso'
};

// Função auxiliar para enviar e-mail
async function sendEmailWithNodemailer(to: string, subject: string, htmlBody: string, senderEmail: string, appPassword: string) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
  });

  const mailOptions = {
    from: senderEmail,
    to: to, 
    subject: subject,
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

// Lógica para 'cobrarUasPendentes'
async function handleCobrarUas(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`Iniciando cobrança de UAs pendentes com ${dados.length} itens.`);
  const uasPendentesRaw = dados.filter(item => 
    item[COLUNAS.ATIVIDADE] === "UA'S ENVIADAS" && item[COLUNAS.IS_PENDENTE] === true
  );
  console.log(`Número de UAs 'UA'S ENVIADAS' e isPendente=true: ${uasPendentesRaw.length}`);

  const uasPorDocente: UasPorDocente = {};
  for (const item of uasPendentesRaw) {
    const nomeDocente = item[COLUNAS.DOCENTE];
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE];
    const disciplina = item[COLUNAS.DISCIPLINA];

    if (!nomeDocente || !emailDocente || !disciplina) {
      console.log(`Item de UA ignorado por dados ausentes: ${JSON.stringify(item)}`);
      continue;
    }
    if (!uasPorDocente[nomeDocente]) {
      uasPorDocente[nomeDocente] = { email: emailDocente, disciplinas: new Set<string>() };
    }
    uasPorDocente[nomeDocente].disciplinas.add(disciplina);
  }

  let docentesCobrados = 0;
  const totalDocentesParaCobrar = Object.keys(uasPorDocente).length;
  console.log(`Total de docentes únicos para cobrar UAs: ${totalDocentesParaCobrar}`);

  for (const nomeDocente in uasPorDocente) {
    const info = uasPorDocente[nomeDocente];
    if (info.disciplinas.size === 0) continue;

    const listaDisciplinasHtml = `<ul>${Array.from(info.disciplinas).sort().map(d => `<li>${d}</li>`).join('')}</ul>`;
    const corpoHtml = 
      `<p>Olá, Professor(a) ${nomeDocente}, tudo bem?</p>
       <p>Sabemos que o dia a dia é sempre uma correria e, para te ajudar a organizar, estamos passando para verificar o andamento do envio do material das UAs (Unidades de Aprendizagem).</p>
       <p>Para que possamos preparar o Ambiente Virtual de Aprendizagem para os alunos, <strong>estamos aguardando o material das seguintes disciplinas:</strong></p>
       ${listaDisciplinasHtml}
       <p>Assim que tiver uma previsão ou puder nos enviar o material, ficaremos muito gratos. Isso nos ajuda a garantir que tudo esteja pronto para os estudantes.</p>
       <p>Se precisar de qualquer ajuda, é só nos chamar!</p>
       <p>Um abraço,<br>Equipe NED</p>`;
    
    if (await sendEmailWithNodemailer(info.email, "Sobre o envio do material (UAs)", corpoHtml, senderEmail, appPassword)) {
      docentesCobrados++;
    }
  }
  if (docentesCobrados === 0 && totalDocentesParaCobrar > 0) {
    return `Tentativa de cobrar ${totalDocentesParaCobrar} docente(s) sobre UAs, mas nenhum e-mail pôde ser enviado. Verifique os logs da função.`;
  }
  return `E-mails de cobrança de UAs para ${docentesCobrados} de ${totalDocentesParaCobrar} docente(s) processados.`;
}

// --- Implementar handleNotificarDocentes e handleNotificarCoordenadores aqui ---
async function handleNotificarDocentes(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`Iniciando notificação de docentes com ${dados.length} itens.`);
  const pendenciasPorDocente: PendenciasPorDocente = {};

  for (const item of dados) {
    const nomeDocente = item[COLUNAS.DOCENTE];
    const emailDocente = item[COLUNAS.EMAIL_DOCENTE];
    if (!nomeDocente || !emailDocente) {
      console.log(`Item ignorado para notificação (docente) por falta de nome/email: ${JSON.stringify(item)}`);
      continue;
    }
    if (!pendenciasPorDocente[nomeDocente]) {
      pendenciasPorDocente[nomeDocente] = { email: emailDocente, atividades: [] };
    }
    pendenciasPorDocente[nomeDocente].atividades.push(item);
  }

  let docentesNotificados = 0;
  const totalDocentes = Object.keys(pendenciasPorDocente).length;
  console.log(`Total de docentes para notificar: ${totalDocentes}`);

  for (const nomeDocente in pendenciasPorDocente) {
    const info = pendenciasPorDocente[nomeDocente];
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

    if (await sendEmailWithNodemailer(info.email, "Notificação de Pendências em Atividades Acadêmicas", corpoHtml, senderEmail, appPassword)) {
      docentesNotificados++;
    }
  }
  return `E-mails para ${docentesNotificados} de ${totalDocentes} docente(s) processados.`;
}

async function handleNotificarCoordenadores(dados: any[], senderEmail: string, appPassword: string): Promise<string> {
  console.log(`Iniciando notificação de coordenadores com ${dados.length} itens.`);
  const pendenciasPorCoordenador: PendenciasPorCoordenador = {};

  for (const item of dados) {
    const nomeCoordenador = item[COLUNAS.COORDENADOR];
    const emailCoordenador = item[COLUNAS.EMAIL_COORDENADOR];
    const nomeCurso = item[COLUNAS.CURSO];
    const nomeDocente = item[COLUNAS.DOCENTE];

    if (!nomeCoordenador || !emailCoordenador || !nomeCurso || !nomeDocente) {
      console.log(`Item ignorado (coordenador) por falta de dados: ${JSON.stringify(item)}`);
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
    pendenciasPorCoordenador[emailCoordenador].cursos[nomeCurso][nomeDocente].push(item);
  }
  
  let coordenadoresNotificados = 0;
  const totalCoordenadores = Object.keys(pendenciasPorCoordenador).length;
  console.log(`Total de coordenadores para notificar: ${totalCoordenadores}`);

  for (const emailCoordenador in pendenciasPorCoordenador) {
    const infoCoordenador = pendenciasPorCoordenador[emailCoordenador];
    let corpoEmailHtml = 
      `<p>Olá, Coordenador(a) ${infoCoordenador.nome}, tudo bem?</p>
       <p>Para te auxiliar no acompanhamento acadêmico, preparamos um resumo dos pontos que merecem atenção em seus cursos esta semana.</p>`;

    for (const nomeCurso in infoCoordenador.cursos) {
      corpoEmailHtml += `<hr><p><b>RESUMO DO CURSO: ${nomeCurso}</b></p>`;
      const docentesDoCurso = infoCoordenador.cursos[nomeCurso];
      for (const nomeDocente in docentesDoCurso) {
        corpoEmailHtml += `<p><b>&nbsp;&nbsp;• Docente:</b> ${nomeDocente}</p>`;
        const atividadesDoDocente = docentesDoCurso[nomeDocente];
        atividadesDoDocente.forEach(item => {
          corpoEmailHtml += 
            `<p>
              &nbsp;&nbsp;&nbsp;&nbsp;- Disciplina: ${item[COLUNAS.DISCIPLINA]}<br>
              &nbsp;&nbsp;&nbsp;&nbsp;- Item pendente: ${item[COLUNAS.ATIVIDADE]}<br>
              &nbsp;&nbsp;&nbsp;&nbsp;- Situação: ${item[COLUNAS.STATUS_CALCULADO]}
            </p>`;
        });
      }
    }
    corpoEmailHtml += 
      `<hr><p>Agradecemos se puder conversar com os docentes para entender e auxiliar na regularização das pendências.</p>
       <p>Qualquer apoio que precisar de nossa parte, é só chamar.</p>
       <p>Um abraço,<br>Equipe NED</p>`;
    
    if (await sendEmailWithNodemailer(emailCoordenador, "Acompanhamento de pendências dos cursos", corpoEmailHtml, senderEmail, appPassword)) {
      coordenadoresNotificados++;
    }
  }
  return `E-mails para ${coordenadoresNotificados} de ${totalCoordenadores} coordenador(es) processados.`;
}
// --- Fim das implementações das ações ---

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