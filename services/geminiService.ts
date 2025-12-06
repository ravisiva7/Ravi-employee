import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, Employee } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAttendanceReport = async (
  records: AttendanceRecord[],
  employees: Employee[],
  periodName: string
): Promise<string> => {
  try {
    // Summarize data to send to Gemini (avoid sending too much raw JSON if possible, but for this scale it's fine)
    // We will aggregate stats per employee to make the prompt efficient
    
    const employeeStats = employees.map(emp => {
      const empRecords = records.filter(r => r.employeeId === emp.id);
      const presentCount = empRecords.filter(r => r.status === 'Present').length;
      const lateCount = empRecords.filter(r => r.status === 'Late').length;
      const totalHours = empRecords.reduce((acc, curr) => acc + curr.durationHours, 0);
      
      return {
        name: emp.name,
        role: emp.role,
        presentCount,
        lateCount,
        avgHours: empRecords.length ? (totalHours / empRecords.length).toFixed(1) : 0
      };
    });

    const prompt = `
      Analyze the following employee attendance data for the period: ${periodName}.
      
      Data Summary:
      ${JSON.stringify(employeeStats, null, 2)}

      Please provide a concise executive summary report in Markdown format.
      Include:
      1. Overall attendance trends.
      2. Highlighting top performers (consistent attendance).
      3. Identifying any potential concerns (e.g., frequent lateness).
      4. A brief actionable recommendation for management.

      Keep the tone professional and constructive.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert HR Data Analyst specializing in workforce efficiency.",
      }
    });

    return response.text || "Unable to generate report at this time.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Error: Could not generate AI insight. Please ensure your API key is configured correctly.";
  }
};
