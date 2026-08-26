import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Planejamento } from "./api";

export function gerarRelatorioPlanejamento(planejamentos: Planejamento[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.text("Relatório de Planejamento Estratégico", 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    14,
    22,
  );
  doc.setTextColor(0);

  const linhas: string[][] = [];

  for (const p of planejamentos) {
    for (const ind of p.indicadores) {
      linhas.push([
        p.objetivo.codigo,
        p.objetivo.nome,
        p.nome,
        ind.nome,
        ind.meta,
        `${ind.rotulo_x} / ${ind.rotulo_y}`,
        ind.orientacao,
        ind.unidades[0]?.nome ?? "—",
        `${Math.round(ind.progresso)}%`,
        p.objetivo.ppa,
        p.objetivo.loa,
      ]);
    }
  }

  autoTable(doc, {
    startY: 28,
    head: [
      [
        "Código",
        "Objetivo Estratégico",
        "Iniciativa",
        "Indicadores",
        "Metas",
        "Fórmula de Cálculo",
        "Orientações p/ Comprovação",
        "Responsável",
        "Progresso",
        "PPA",
        "LOA",
      ],
    ],
    body: linhas,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 30 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { cellWidth: 35 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18, halign: "center" },
      9: { cellWidth: 30 },
      10: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save("relatorio-planejamento.pdf");
}
