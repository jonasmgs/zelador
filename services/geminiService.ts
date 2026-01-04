
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateDailyChecklist(condoInfo: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Com base nas informações do condomínio: "${condoInfo}", gere um checklist de 5 a 7 tarefas essenciais para um zelador realizar hoje. Retorne apenas o JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "description", "category"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
}

export async function summarizeActivities(activities: any[], periodDescription: string, customPrompt?: string, incidents?: any[]) {
  const activitiesStr = JSON.stringify(activities);
  const incidentsStr = incidents ? JSON.stringify(incidents) : 'Nenhuma ocorrência registrada.';
  
  const userInstruction = customPrompt 
    ? `\n\nINSTRUÇÃO ESPECÍFICA DO USUÁRIO (Siga rigorosamente): ${customPrompt}` 
    : '';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Você é um consultor especializado em gestão condominial de alto nível. 
    Gere um relatório executivo detalhado para o período de ${periodDescription}.
    
    DADOS DE ATIVIDADES: ${activitiesStr}
    LIVRO DE OCORRÊNCIAS: ${incidentsStr}
    
    O relatório deve:
    1. Ser profissional e executivo.
    2. Destacar a eficiência da equipe e a resolução de problemas (ocorrências).
    3. Apontar possíveis gargalos operacionais ou padrões de incidentes.
    4. Sugerir melhorias estratégicas e preventivas.${userInstruction}
    
    Formate a saída com títulos claros, use Markdown e mantenha um tom de autoridade e consultoria.`,
  });

  return response.text;
}

export async function summarizeDailyActivities(activities: any[]) {
  return summarizeActivities(activities, 'hoje');
}
