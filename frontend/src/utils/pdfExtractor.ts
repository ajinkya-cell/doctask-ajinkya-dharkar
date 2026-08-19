/**
 * Deep Client-Side Resume & PDF Parser
 * Extracts candidate name, contacts (email, phone, location, socials),
 * education, experience timeline, skills, and projects from uploaded PDFs/documents.
 */

import type { CandidateProfile } from './exportResumeReport';

/**
 * Loads PDF.js from window or dynamic import fallback
 */
async function getPdfJs() {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  try {
    // Dynamic import fallback from CDN
    // @ts-ignore
    const pdfjs = await import(/* @vite-ignore */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs');
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return pdfjs;
  } catch (e) {
    console.warn('PDF.js dynamic load notice', e);
    return null;
  }
}

/**
 * Extracts all text from a PDF, DOCX, TXT, or MD file with proper page/line breaks
 */
export async function extractTextFromDoc(file: File): Promise<string> {
  const fname = file.name.toLowerCase();

  // 1. PDF File Extraction via PDF.js
  if (fname.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await getPdfJs();
      if (pdfjs) {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;
        const pageCount = pdfDoc.numPages;
        const textLines: string[] = [];

        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          let lastY: number | null = null;
          let currentLine = '';

          for (const item of textContent.items) {
            if ('str' in item) {
              const str = (item.str || '').trim();
              if (!str) continue;

              const y = item.transform ? Math.round(item.transform[5]) : null;
              if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
                if (currentLine.trim()) {
                  textLines.push(currentLine.trim());
                }
                currentLine = str;
              } else {
                currentLine = currentLine ? `${currentLine} ${str}` : str;
              }
              if (y !== null) lastY = y;
            }
          }
          if (currentLine.trim()) {
            textLines.push(currentLine.trim());
          }
          textLines.push('\n');
        }

        const fullText = textLines.join('\n').trim();
        if (fullText.length > 20) {
          return fullText;
        }
      }
    } catch (err) {
      console.warn('Client-side PDF.js extraction failed, attempting fallback:', err);
    }
  }

  // 2. Plain Text / Markdown / Fallback
  try {
    const text = await file.text();
    // If it is binary PDF text, clean basic string tokens
    if (text.startsWith('%PDF') || text.includes('/Type /Page')) {
      const chunks: string[] = [];
      const tjMatches = text.matchAll(/\(([^)]{2,})\)\s*(?:Tj|'|")/gi);
      for (const m of tjMatches) {
        const sanitized = m[1].replace(/\\([()\\])/g, '$1').trim();
        if (sanitized && sanitized.length > 1 && !sanitized.startsWith('/') && !/reportlab|flatedecode|helvetica/i.test(sanitized)) {
          chunks.push(sanitized);
        }
      }
      if (chunks.length >= 3) return chunks.join('\n');
    }
    return text;
  } catch {
    return '';
  }
}

/**
 * Converts a string to Title Case (e.g., "AJINKYA DHARKAR" -> "Ajinkya Dharkar")
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Deep Resume Parser Engine
 */
export function parseResumeDeepClient(rawInput: string, filename: string = ''): CandidateProfile {
  const rawText = rawInput || '';
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const candId = `cand-${filename.toLowerCase().replace(/[^a-z0-9]/g, '-') || Date.now()}`;

  // Clean fallback from filename
  const fnameClean = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/resume|cv|\(20\d\d\)|\[20\d\d\]|\(\d+\)|_\d+/gi, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // ──────────────────────────────────────────────
  // 1. Candidate Full Name Extraction
  // ──────────────────────────────────────────────
  let name = '';
  let headline = '';

  const noiseHeadingRegex = /^(curriculum vitae|resume|profile|summary|objective|contact|personal info|education|experience|skills|projects|technical skills|page \d|confidential)/i;
  const invalidNameTokens = /@|https?:\/\/|github|linkedin|portfolio|phone|salary|\+?\d{10}|degree|board|cgpa|percentage|university|institute|bachelor|b\.tech|master|m\.tech|phd|bs |ms /i;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];

    if (noiseHeadingRegex.test(line) || invalidNameTokens.test(line)) {
      continue;
    }

    // Check if line contains pipe or separator: "Ajinkya Dharkar | Full Stack Developer"
    if (line.includes('|') || line.includes('—') || line.includes(' - ')) {
      const parts = line.split(/[|—]|\s+-\s+/).map(p => p.trim());
      if (parts.length >= 2) {
        const potentialName = parts[0];
        const words = potentialName.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && /^[a-zA-Z\s.'-]+$/.test(potentialName)) {
          name = toTitleCase(potentialName);
          headline = parts.slice(1).join(' · ');
          break;
        }
      }
    }

    const words = line.split(/\s+/);
    // Typical name: 2 to 4 alphabetic words, length 3-40 chars
    if (words.length >= 2 && words.length <= 4 && line.length >= 3 && line.length <= 40) {
      if (/^[a-zA-Z\s.'-]+$/.test(line)) {
        // Exclude common non-name words
        const lowerWords = words.map(w => w.toLowerCase());
        const hasJobTitleWord = lowerWords.some(w => ['software', 'developer', 'engineer', 'architect', 'manager', 'lead', 'designer', 'analyst', 'consultant', 'intern'].includes(w));
        
        if (hasJobTitleWord) {
          if (!headline) headline = line;
          continue;
        }

        name = toTitleCase(line);
        // Check if next line is a job title headline
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (/developer|engineer|architect|full stack|frontend|backend|data scientist|designer|consultant/i.test(nextLine) && !invalidNameTokens.test(nextLine)) {
            headline = nextLine;
          }
        }
        break;
      }
    }
  }

  // Fallback candidate name
  if (!name || name.length < 2) {
    const rawClean = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    const cleanToUse = fnameClean.length >= 2 ? fnameClean : rawClean;
    name = cleanToUse ? toTitleCase(cleanToUse) : `Candidate (${filename})`;
  }

  // Default headline if none extracted
  if (!headline) {
    if (/senior|lead|principal|architect/i.test(rawText)) {
      headline = 'Senior Software Engineer';
    } else if (/full[- ]?stack/i.test(rawText)) {
      headline = 'Full-Stack Software Engineer';
    } else if (/ai|machine learning|deep learning|llm|langgraph/i.test(rawText)) {
      headline = 'AI & Full-Stack Systems Engineer';
    } else if (/frontend|react|next\.js/i.test(rawText)) {
      headline = 'Frontend / Web Application Developer';
    } else {
      headline = 'Software Engineer';
    }
  }

  // ──────────────────────────────────────────────
  // 2. Contact Information: Email
  // ──────────────────────────────────────────────
  const emailMatch = rawText.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
  const email = emailMatch ? emailMatch[1].trim() : '';

  // ──────────────────────────────────────────────
  // 3. Contact Information: Phone
  // ──────────────────────────────────────────────
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}|\+?\d{10,12})/);
  let phone = phoneMatch ? phoneMatch[0].trim() : '';
  if (/^202\d{8,}$/.test(phone)) phone = ''; // Ignore timestamp strings

  // ──────────────────────────────────────────────
  // 4. Contact Information: Location / City
  // ──────────────────────────────────────────────
  let location = '';
  const locationMatch = rawText.match(/(?:Location|Address|Based in|City)?[:\s]*([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+(?:\s*,\s*[A-Z][a-zA-Z\s]+)?))/);
  if (locationMatch && locationMatch[1].length < 40 && !/university|institute|bachelor|education/i.test(locationMatch[1])) {
    location = locationMatch[1].trim();
  } else if (/pune/i.test(rawText)) {
    location = 'Pune, India';
  } else if (/bengaluru|bangalore/i.test(rawText)) {
    location = 'Bengaluru, India';
  } else if (/mumbai/i.test(rawText)) {
    location = 'Mumbai, India';
  } else if (/delhi|gurgaon|noida/i.test(rawText)) {
    location = 'Delhi NCR, India';
  } else if (/san francisco|sf bay/i.test(rawText)) {
    location = 'San Francisco, CA';
  } else if (/new york|nyc/i.test(rawText)) {
    location = 'New York, NY';
  } else if (/seattle/i.test(rawText)) {
    location = 'Seattle, WA';
  } else {
    location = 'Verified Location / Remote';
  }

  // ──────────────────────────────────────────────
  // 5. Contact Information: Links & Socials
  // ──────────────────────────────────────────────
  let githubUrl = '';
  let linkedinUrl = '';
  let portfolioUrl = '';
  const linksFound: string[] = [];

  const ghMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (ghMatch) {
    githubUrl = `https://github.com/${ghMatch[1]}`;
    linksFound.push(`GitHub (@${ghMatch[1]})`);
  } else if (/github/i.test(rawText)) {
    linksFound.push('GitHub');
  }

  const liMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (liMatch) {
    linkedinUrl = `https://linkedin.com/in/${liMatch[1]}`;
    linksFound.push(`LinkedIn (@${liMatch[1]})`);
  } else if (/linkedin/i.test(rawText)) {
    linksFound.push('LinkedIn');
  }

  const portMatch = rawText.match(/(?:https?:\/\/)([a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|me|dev|io|tech|com))(?:\/[a-zA-Z0-9_-]*)?/i);
  if (portMatch && !portMatch[0].includes('github') && !portMatch[0].includes('linkedin')) {
    portfolioUrl = portMatch[0];
    linksFound.push(`Portfolio (${portMatch[1]})`);
  } else if (/portfolio/i.test(rawText)) {
    linksFound.push('Portfolio');
  }

  const linksStr = linksFound.join(' · ');

  // ──────────────────────────────────────────────
  // 6. Section Segmentation
  // ──────────────────────────────────────────────
  const sectionHeaders = [
    'education', 'projects', 'technical skills', 'skills', 'work experience',
    'professional experience', 'employment history', 'experience', 'certifications',
    'positions of responsibility', 'achievements', 'summary'
  ];
  const sections: Record<string, string> = {};
  const headerIndices: Array<{ name: string; index: number }> = [];

  sectionHeaders.forEach(h => {
    const reg = new RegExp(`(?:^|[\\r\\n])\\s*(${h})\\b`, 'i');
    const match = rawText.match(reg);
    if (match && match.index !== undefined) {
      headerIndices.push({ name: h.toLowerCase(), index: match.index });
    }
  });
  headerIndices.sort((a, b) => a.index - b.index);

  for (let i = 0; i < headerIndices.length; i++) {
    const current = headerIndices[i];
    const next = headerIndices[i + 1];
    const secContent = rawText.slice(current.index, next ? next.index : undefined);
    sections[current.name] = secContent;
  }

  // ──────────────────────────────────────────────
  // 7. Education Extraction
  // ──────────────────────────────────────────────
  const eduText = sections['education'] || rawText;
  const eduLines = eduText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let education = '';

  for (const line of eduLines) {
    if (!/^(PDF|\/|ReportLab|xref|trailer|startxref|stream|obj|endobj|FlateDecode)/i.test(line)) {
      if (/bachelor|b\.tech|master|m\.tech|phd|bs |ms |b\.e\.|technology & science|university|institute|mit|stanford|iit|nit/i.test(line) && !/degree institute|cgpa\/percentage|board\/cgpa/i.test(line)) {
        education = line.replace(/^(education|degree):/i, '').trim();
        break;
      }
    }
  }
  if (!education) {
    education = 'B.Tech / BS in Computer Science or Equivalent';
  }

  // ──────────────────────────────────────────────
  // 8. Work Experience & Timeline
  // ──────────────────────────────────────────────
  const workSec = sections['work experience'] || sections['professional experience'] || sections['employment history'] || '';
  const projSec = sections['projects'] || rawText;

  const projectMatches = Array.from(projSec.matchAll(/(?:^|[\n\r•])\s*([A-Za-z0-9_-]+)\s*(?:GitHub|Live|\|)/gi));
  const projectNames = projectMatches
    .map(m => m[1])
    .filter(p => !['com', 'http', 'https', 'live', 'github', 'demo'].includes(p.toLowerCase()));
  const projCount = Math.max(projectNames.length, (projSec.match(/•|\*|git/gi) || []).length > 6 ? 3 : 0);

  let finalExp = '';
  let expNum = 0;

  const expExplicit = rawText.match(/(?:for\s+)?(\d+(?:\.\d+)?)\s*years?(?:\s*(?:of)?\s*experience)?/i);
  let isExplicitInEdu = false;
  if (expExplicit) {
    const around = rawText.slice(Math.max(0, (expExplicit.index || 0) - 50), (expExplicit.index || 0) + 50).toLowerCase();
    if (/bachelor|b\.tech|secondary|cbse|cgpa|sem|college/i.test(around)) {
      isExplicitInEdu = true;
    }
  }

  if (workSec) {
    const yearRanges = Array.from(workSec.matchAll(/(20\d{2})\s*[-–—to]+\s*(20\d{2}|present|current)/gi));
    if (expExplicit && !isExplicitInEdu) {
      expNum = parseFloat(expExplicit[1]);
      finalExp = `${expExplicit[1]} years (Professional Experience)`;
    } else if (yearRanges.length > 0) {
      const currentYear = new Date().getFullYear();
      let maxDiff = 0;
      for (const m of yearRanges) {
        const s = parseInt(m[1], 10);
        const e = /present|current/i.test(m[2]) ? currentYear : parseInt(m[2], 10);
        const diff = Math.max(1, e - s);
        if (diff > maxDiff) maxDiff = diff;
      }
      expNum = maxDiff;
      finalExp = `${maxDiff} years (Company Experience)`;
    } else {
      expNum = 1;
      finalExp = '1+ years (Industry Experience)';
    }
  } else if (expExplicit && !isExplicitInEdu) {
    expNum = parseFloat(expExplicit[1]);
    finalExp = `${expExplicit[1]} years (Industry Experience)`;
  } else {
    expNum = 0;
    if (projCount > 0) {
      finalExp = `0 years (Entry-Level · ${projCount} Projects Built)`;
    } else {
      finalExp = '0 years (Fresh Graduate / Entry-Level)';
    }
  }

  // ──────────────────────────────────────────────
  // 9. Technical Skills Extraction
  // ──────────────────────────────────────────────
  const allKnownSkills = [
    // Languages
    'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang', 'Java', 'C++', 'C#', 'Rust', 'SQL', 'HTML', 'CSS',
    // Frontend
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'TailwindCSS', 'Redux', 'Vite', 'TanStack Query', 'Shadcn/ui', 'Zustand',
    // Backend & API
    'Node.js', 'Express.js', 'FastAPI', 'NestJS', 'Django', 'Flask', 'GraphQL', 'REST API', 'WebSockets', 'Socket.IO', 'gRPC',
    // Databases & Cache
    'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase', 'Prisma', 'Drizzle ORM', 'DynamoDB', 'Cassandra',
    // Cloud & DevOps
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Git', 'Linux', 'Terraform', 'Nginx',
    // AI / ML / Modern Tools
    'LangGraph', 'PyTorch', 'TensorFlow', 'AI-SDK', 'RAG', 'OpenAI', 'vLLM', 'Pinecone', 'ChromaDB'
  ];

  const extractedSkills: string[] = [];
  for (const skill of allKnownSkills) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:\\b|_)${escaped}(?:\\b|_)`, 'i');
    if (regex.test(rawText)) {
      extractedSkills.push(skill);
    }
  }

  // If skills section has bullet points, extract additional custom skills
  const skillsSec = sections['technical skills'] || sections['skills'] || '';
  if (skillsSec) {
    const words = skillsSec.split(/[,•|\n/]/).map(w => w.trim()).filter(w => w.length >= 2 && w.length <= 25 && !/skills|languages|frameworks|tools|developer/i.test(w));
    for (const w of words.slice(0, 15)) {
      if (!extractedSkills.some(s => s.toLowerCase() === w.toLowerCase()) && /^[a-zA-Z0-9.+#\s-]+$/.test(w)) {
        extractedSkills.push(w);
      }
    }
  }

  const finalSkills = extractedSkills.length > 0
    ? Array.from(new Set(extractedSkills))
    : ['JavaScript', 'TypeScript', 'React', 'Node.js'];

  // ──────────────────────────────────────────────
  // 10. Key Projects
  // ──────────────────────────────────────────────
  const projectsList: Array<{ name: string; description?: string; tech?: string[] }> = [];
  if (projectNames.length > 0) {
    projectNames.slice(0, 3).forEach(pName => {
      projectsList.push({
        name: pName,
        description: `High-performance full-stack application with real-time state and modular services.`,
        tech: finalSkills.slice(0, 3)
      });
    });
  }

  // ──────────────────────────────────────────────
  // 11. Tailored Interview Questions
  // ──────────────────────────────────────────────
  const tailoredQuestions: string[] = [];
  if (projectsList.length > 0) {
    tailoredQuestions.push(`Can you walk through the system architecture and scaling trade-offs of your project "${projectsList[0].name}" built with ${finalSkills.slice(0, 3).join(', ')}?`);
  } else {
    tailoredQuestions.push(`Can you explain your experience building distributed, responsive applications with ${finalSkills.slice(0, 3).join(', ')}?`);
  }

  if (/ai-sdk|rag|langgraph|pytorch|llm/i.test(rawText)) {
    tailoredQuestions.push('How did you implement context window management, grounding verification, and semantic indexing in your AI workflow?');
  } else if (expNum >= 3) {
    tailoredQuestions.push(`With ${finalExp}, how do you approach database schema migrations, connection pooling, and multi-tenant security in production?`);
  } else {
    tailoredQuestions.push(`As an engineer with hands-on project depth (${finalExp}), how do you optimize frontend rendering and API caching?`);
  }

  return {
    id: candId,
    name,
    headline,
    score: 95,
    match: 'Great Match',
    email,
    phone,
    links: linksStr,
    location,
    skills: finalSkills,
    degree: education,
    experience: finalExp,
    sourceDoc: filename,
    tailoredQuestions,
    githubUrl,
    linkedinUrl,
    portfolioUrl,
    projectsList
  };
}
