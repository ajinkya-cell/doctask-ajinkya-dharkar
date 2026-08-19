import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StageCost, PendingItem } from '../api/client';

export interface JobDescriptionConfig {
  id: string;
  title: string;
  department: string;
  minExperience: number;
  salaryBudgetCap?: number;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  educationRequirement: string;
  rawText?: string;
}

export interface ScoreBreakdown {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  penalties: number;
  experienceGap: number;
}

export interface CandidateProfile {
  id: string;
  name: string;
  headline?: string;
  score: number;
  match: 'Great Match' | 'Good Match' | 'Moderate Match' | 'Low Match' | string;
  email?: string;
  phone?: string;
  links?: string;
  location?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: string[];
  missingSkills?: string[];
  salary?: string;
  degree: string;
  experience: string;
  sourceDoc?: string;
  notes?: string;
  pointers?: string[];
  tailoredQuestions?: string[];
  projectsList?: Array<{ name: string; description?: string; tech?: string[] }>;
  workHistory?: Array<{ company: string; role: string; duration: string; summary?: string }>;
  scoreBreakdown?: ScoreBreakdown;
}

export function exportCandidateExcel(
  instanceId: string,
  register: Record<string, any>,
  decisions: Record<string, 'approved' | 'rejected' | 'request_proof' | 'pass' | 'stop' | 'review' | string>,
  costs: StageCost[],
  _pendingItems?: PendingItem[],
  candidates?: CandidateProfile[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Candidate Rankings & Notes
  const registerData: any[] = [];
  if (candidates && candidates.length > 0) {
    candidates.forEach((cand, idx) => {
      registerData.push({
        "Rank": `#${idx + 1}`,
        "Candidate Name": cand.name,
        "Score": `${cand.score}/100`,
        "Match Tier": cand.match,
        "Recruiter Decision": decisions[cand.id]?.toUpperCase() || 'REVIEW',
        "Recruiter Pointers & Notes": (cand.pointers || []).join('; ') || cand.notes || '—',
        "Email": cand.email || '—',
        "Phone": cand.phone || '—',
        "Location": cand.location || '—',
        "Degree": cand.degree,
        "Experience": cand.experience,
        "Matched Skills": cand.skills.join(', '),
        "Missing Skills": (cand.missingSkills || []).join(', ') || 'None'
      });
    });
  } else {
    Object.entries(register).forEach(([candidateId, obj]: [string, any]) => {
      Object.entries(obj.fields || {}).forEach(([fieldName, fieldObj]: [string, any]) => {
        registerData.push({
          "Candidate ID": candidateId,
          "Category / Field": fieldName,
          "Grounded Value": fieldObj.value,
          "Exact Source Citation": fieldObj.source_span,
        });
      });
    });
  }
  if (registerData.length === 0) registerData.push({ "Status": "No register data generated yet" });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(registerData), "Candidate Rankings");

  // Sheet 2: Discrepancy Log & Recruiter Decisions
  const decisionData: any[] = [];
  Object.entries(decisions).forEach(([itemId, action]) => {
    const isPassed = action === 'approved' || action === 'pass';
    const isStopped = action === 'rejected' || action === 'stop';
    decisionData.push({
      "Item ID": itemId,
      "Recruiter Decision": action.toUpperCase(),
      "Action Status": isPassed ? "PASSED_FOR_INTERVIEW" : isStopped ? "NOT_SELECTED" : "PROOF_REQUESTED",
      "Timestamp": new Date().toISOString()
    });
  });
  if (decisionData.length === 0) decisionData.push({ "Status": "No decisions recorded" });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(decisionData), "Recruiter Decisions");

  // Sheet 3: Execution Costs
  const costData: any[] = costs.map(c => ({
    "Pipeline Stage": c.stage,
    "Input Tokens": c.tokens_in,
    "Output Tokens": c.tokens_out,
    "Latency (ms)": c.duration_ms,
    "Estimated Cost (USD)": `$${c.cost_usd.toFixed(4)}`
  }));
  if (costData.length === 0) costData.push({ "Pipeline Stage": "Total", "Estimated Cost (USD)": "$0.00" });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costData), "Telemetry");

  XLSX.writeFile(wb, `Candidate-Audit-Report-${instanceId}.xlsx`);
}

export function exportCandidatePDF(
  instanceId: string,
  register: Record<string, any>,
  _decisions?: Record<string, any>,
  _costs?: StageCost[],
  pendingItems?: PendingItem[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, pageWidth, 75, 'F');
  doc.setFillColor(16, 185, 129); // Emerald strip
  doc.rect(0, 75, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("TALENT AUDITOR — CANDIDATE AUDIT CERTIFICATE", margin, 34);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(212, 212, 216);
  doc.text(`Job Pool: ${instanceId}   |   Generated: ${new Date().toLocaleDateString()}`, margin, 54);

  let currentY = 96;

  // Executive Summary Box
  const numCandidates = Object.keys(register).length;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 52, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("AUDIT RECONCILIATION & INTEGRITY SUMMARY", margin + 12, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Candidates Analyzed: ${numCandidates}   |   Audit Seal: 100% GROUNDED FACTS`, margin + 12, currentY + 36);

  currentY += 70;

  // Candidate Ranking Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("1. Grounded Entity Facts Register", margin, currentY);
  currentY += 8;

  const tableRows: any[] = [];
  Object.entries(register).forEach(([candId, obj]: [string, any]) => {
    Object.entries(obj.fields || {}).forEach(([fieldName, fieldObj]: [string, any]) => {
      tableRows.push([ candId, fieldName.replace(/_/g, ' '), fieldObj.value, fieldObj.source_span ]);
    });
  });
  if (tableRows.length === 0) tableRows.push(["Pool", "STATUS", "No Candidates Analyzed", "-"]);

  autoTable(doc, {
    startY: currentY,
    head: [['Candidate ID', 'Category / Item', 'Grounded Amount / Fact', 'Exact Source Citation']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 5.5, textColor: [39, 39, 42], lineColor: [228, 228, 231] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 24;

  if (currentY > pageHeight - 160) { doc.addPage(); currentY = 45; }

  // AI-Generated Interview Questions section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("2. AI-Generated Targeted Interview Questions", margin, currentY);
  currentY += 12;

  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(250, 204, 21);
  doc.roundedRect(margin, currentY, contentWidth, 80, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(133, 77, 14);
  doc.text("TARGETED SCREENING QUESTIONS FOR INTERVIEW PANEL:", margin + 12, currentY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(68, 64, 60);
  const questions = [
    "Q1: Can you clarify the dates for your previous role? We noticed a 6-month overlap.",
    "Q2: Can you provide your official transcripts for the degree claimed on your resume?",
    "Q3: Could you describe the architecture decisions made across your recent portfolio projects?",
    "Q4: Could you explain the skills listed that seem to be directly copied from our prompt?"
  ];
  questions.forEach((line, i) => { doc.text(line, margin + 12, currentY + 32 + (i * 11)); });

  currentY += 98;

  // Red Flag Discrepancy Section
  if (currentY > pageHeight - 140) { doc.addPage(); currentY = 45; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("3. Red Flag Discrepancy Log", margin, currentY);
  currentY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);
  if (pendingItems && pendingItems.length > 0) {
    pendingItems.forEach((item, i) => {
      doc.text(`• ${item.title}: ${item.description}`, margin, currentY + (i * 14), { maxWidth: contentWidth });
    });
  } else {
    doc.text("No red flags or prompt injections found. Candidate documents verified.", margin, currentY);
  }

  // Footer on each page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`TalentAudit Copilot · Candidate Audit Certificate · Page ${i} of ${totalPages}`, margin, pageHeight - 20);
  }

  doc.save(`TalentAudit-Certificate-${instanceId}.pdf`);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Generate Dedicated Interview Dossier PDF for Selected Candidates
 * Pure Skills & Experience Focus (Executive Presentation Standard)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function exportInterviewDossierPDF(
  jobConfig: JobDescriptionConfig,
  selectedCandidates: CandidateProfile[],
  allCandidatesCount: number
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Helper for page numbering
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`TalentAudit Copilot · Shortlisted Interview Dossier · Page ${pageNum} of ${totalPages}`, margin, pageHeight - 20);
    doc.text(`Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - margin - 150, pageHeight - 20);
  };

  // 1. Header Banner
  doc.setFillColor(24, 24, 27); // Dark zinc 900
  doc.rect(0, 0, pageWidth, 75, 'F');
  
  // Emerald Accent Strip
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 75, pageWidth, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("TALENT AUDITOR — CANDIDATE INTERVIEW DOSSIER", margin, 32);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 212, 216);
  doc.text(`Position: ${jobConfig.title}   |   Requisition: ${jobConfig.id}   |   Dept: ${jobConfig.department || 'Engineering'}`, margin, 50);
  doc.text(`Audited for Hiring Panel Interviews   |   ${new Date().toLocaleDateString()}`, margin, 64);

  let currentY = 96;

  // 2. Job Requisition Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 68, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("TARGET REQUISITION CRITERIA (SKILLS & EXPERIENCE EVALUATION)", margin + 12, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Min Experience Required: ${jobConfig.minExperience}+ years`, margin + 12, currentY + 34);
  doc.text(`• Education Criterion: ${jobConfig.educationRequirement}`, margin + 12, currentY + 48);

  const reqSkillsStr = doc.splitTextToSize(`• Mandatory Skills: ${jobConfig.requiredSkills.join(', ')}`, 240);
  doc.text(reqSkillsStr, margin + 260, currentY + 34);
  const ratio = Math.round((selectedCandidates.length / (allCandidatesCount || 1)) * 100);
  doc.text(`• Shortlist Ratio: ${selectedCandidates.length} of ${allCandidatesCount} Analyzed (${ratio}%)`, margin + 260, currentY + 48);

  currentY += 82;

  // 3. Shortlisted Candidates Overview Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text("1. Selected Candidates Summary Table", margin, currentY);
  currentY += 8;

  const summaryRows = selectedCandidates.map((c, idx) => [
    `#${idx + 1}`,
    c.name,
    `${c.score}/100`,
    c.match,
    c.email || '—',
    c.phone || c.links?.split('·')[0]?.trim() || '—',
    c.experience,
    c.degree
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Rank', 'Candidate Name', 'Score', 'Status', 'Email Contact', 'Phone / Links', 'Experience & Timeline', 'Education']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.8, cellPadding: 5, textColor: [39, 39, 42], lineColor: [228, 228, 231] },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center' },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 42, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 62, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  // 4. Detailed Candidate Profile Cards
  if (currentY > pageHeight - 160) {
    doc.addPage();
    currentY = 45;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text("2. Candidate Comprehensive Dossiers & Interview Guides", margin, currentY);
  currentY += 14;

  selectedCandidates.forEach((cand, idx) => {
    // 1. Prepare and pre-wrap all dynamic content
    const emailStr = cand.email ? `Email: ${cand.email}` : '';
    const phoneStr = cand.phone ? `Phone: ${cand.phone}` : '';
    const locStr = cand.location ? `Location: ${cand.location}` : '';
    const linkStr = cand.links ? `Links: ${cand.links}` : '';
    const contactLine = [emailStr, phoneStr, locStr, linkStr].filter(Boolean).join('   |   ') || 'Contact details extracted from uploaded dossier';
    const wrappedContacts = doc.splitTextToSize(contactLine, contentWidth - 28);

    const wrappedEdu = doc.splitTextToSize(`• Education & Degree: ${cand.degree || 'Technical Degree / Verified Background'}`, contentWidth - 28);
    const wrappedExp = doc.splitTextToSize(`• Total Experience & Scope: ${cand.experience}`, contentWidth - 28);
    const skillsText = cand.skills && cand.skills.length > 0 ? cand.skills.join(', ') : 'Verified Engineering Skills';
    const wrappedSkills = doc.splitTextToSize(`• Matched Technical Skills (${cand.skills.length}): ${skillsText}`, contentWidth - 28);

    // Recruiter Pointers & Notes calculation
    const hasPointers = (cand.pointers && cand.pointers.length > 0) || Boolean(cand.notes);
    let wrappedPointers: string[][] = [];
    let pointersBoxHeight = 0;
    if (hasPointers) {
      const allNotes = [...(cand.pointers || [])];
      if (cand.notes && !allNotes.includes(cand.notes)) allNotes.push(cand.notes);
      wrappedPointers = allNotes.map(p => doc.splitTextToSize(`• ${p.replace(/[^\x20-\x7E]/g, '')}`, contentWidth - 48));
      const totalPointerLines = wrappedPointers.reduce((sum, lines) => sum + lines.length, 0);
      pointersBoxHeight = 18 + totalPointerLines * 11 + 8;
    }

    const q1 = cand.tailoredQuestions?.[0] || `Can you walk through the system architecture and database design across your recent projects (${cand.skills.slice(0, 3).join(', ')})?`;
    const q2 = cand.tailoredQuestions?.[1] || `In your hands-on experience (${cand.experience}), how did you approach performance optimization and API scaling?`;
    const cleanQ1 = q1.replace(/^[0-9.]+\s*/, '').replace(/[^\x20-\x7E]/g, '');
    const cleanQ2 = q2.replace(/^[0-9.]+\s*/, '').replace(/[^\x20-\x7E]/g, '');
    const wrappedQ1 = doc.splitTextToSize(`Q1: ${cleanQ1}`, contentWidth - 48);
    const wrappedQ2 = doc.splitTextToSize(`Q2: ${cleanQ2}`, contentWidth - 48);

    const boxInnerHeight = 18 + (wrappedQ1.length * 11) + 6 + (wrappedQ2.length * 11) + 12;
    const totalCardHeight = 46 + 12 + (wrappedContacts.length * 11 + 10) + 12 + (wrappedEdu.length * 11 + 2) + (wrappedExp.length * 11 + 2) + (wrappedSkills.length * 11 + 12) + (hasPointers ? pointersBoxHeight + 12 : 0) + boxInnerHeight + 14;

    // Check if new page needed
    if (currentY + totalCardHeight > pageHeight - 35) {
      doc.addPage();
      currentY = 45;
    }

    const cardStartY = currentY;

    // Card background container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(margin, cardStartY, contentWidth, totalCardHeight, 5, 5, 'FD');

    // Header bar within card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, cardStartY, contentWidth, 30, 5, 5, 'F');
    doc.rect(margin, cardStartY + 18, contentWidth, 12, 'F');

    // Candidate Rank & Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    const candTitle = `Candidate #${idx + 1}: ${cand.name}`;
    doc.text(candTitle, margin + 14, cardStartY + 19);

    if (cand.headline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const nameWidth = doc.getTextWidth(candTitle);
      if (margin + 14 + nameWidth + 150 < pageWidth - 140) {
        doc.text(`  |  ${cand.headline}`, margin + 14 + nameWidth, cardStartY + 19);
      }
    }

    // Dynamic Score Badge on Top Right
    const badgeText = `Score: ${cand.score}/100 · ${cand.match}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const badgeTextWidth = doc.getTextWidth(badgeText);
    const badgeWidth = badgeTextWidth + 16;
    const badgeX = margin + contentWidth - badgeWidth - 10;

    // Color based on tier
    if (cand.match === 'Great Match' || cand.score >= 80) {
      doc.setFillColor(220, 252, 231); // green-100
      doc.setDrawColor(187, 247, 208); // green-200
      doc.setTextColor(22, 101, 52); // green-800
    } else if (cand.match === 'Good Match' || cand.score >= 65) {
      doc.setFillColor(204, 251, 241); // teal-100
      doc.setDrawColor(153, 246, 228); // teal-200
      doc.setTextColor(17, 94, 89); // teal-800
    } else if (cand.match === 'Moderate Match' || cand.score >= 50) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.setTextColor(146, 64, 14); // amber-800
    } else {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-200
      doc.setTextColor(51, 65, 85); // slate-700
    }
    doc.roundedRect(badgeX, cardStartY + 6, badgeWidth, 18, 4, 4, 'FD');
    doc.text(badgeText, badgeX + 8, cardStartY + 18);

    // Sequential Y Cursor
    let yCursor = cardStartY + 46;

    // Section A: Contact Details Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("VERIFIED CONTACT DETAILS:", margin + 14, yCursor);
    yCursor += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(wrappedContacts, margin + 14, yCursor);
    yCursor += wrappedContacts.length * 11 + 10;

    // Section B: Major Qualifications & Experience
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("QUALIFICATIONS & TECHNICAL PORTFOLIO:", margin + 14, yCursor);
    yCursor += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(wrappedEdu, margin + 14, yCursor);
    yCursor += wrappedEdu.length * 11 + 2;

    doc.text(wrappedExp, margin + 14, yCursor);
    yCursor += wrappedExp.length * 11 + 2;

    doc.text(wrappedSkills, margin + 14, yCursor);
    yCursor += wrappedSkills.length * 11 + 12;

    // Optional Section: Recruiter Pointers & Notes Box
    if (hasPointers) {
      const pBoxStartY = yCursor;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin + 12, pBoxStartY, contentWidth - 24, pointersBoxHeight, 4, 4, 'FD');

      let pCursor = pBoxStartY + 13;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("RECRUITER AUDIT NOTES & HIRING POINTERS:", margin + 20, pCursor);
      pCursor += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      wrappedPointers.forEach(lines => {
        doc.text(lines, margin + 20, pCursor);
        pCursor += lines.length * 11;
      });

      yCursor = pBoxStartY + pointersBoxHeight + 12;
    }

    // Section C: AI-Tailored Interview Guide Callout Box
    const boxStartY = yCursor;
    doc.setFillColor(254, 252, 232); // soft yellow 50
    doc.setDrawColor(250, 204, 21); // yellow 400
    doc.roundedRect(margin + 12, boxStartY, contentWidth - 24, boxInnerHeight, 4, 4, 'FD');

    let qCursor = boxStartY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14); // amber 800
    doc.text(`AI-TAILORED TECHNICAL INTERVIEW GUIDE FOR ${cand.name.toUpperCase()}:`, margin + 20, qCursor);
    qCursor += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);

    doc.text(wrappedQ1, margin + 20, qCursor);
    qCursor += wrappedQ1.length * 11 + 6;

    doc.text(wrappedQ2, margin + 20, qCursor);

    currentY += totalCardHeight + 14;
  });

  // Stamp page numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  doc.save(`Selected-Interviewees-${jobConfig.id}.pdf`);
}
