import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { db, ensureSchema } from '@/lib/db';

function safe(v: unknown) { return v == null ? '' : String(v); }

function binaryResponse(data: Uint8Array, contentType: string, filename: string) {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);
  const blob = new Blob([arrayBuffer], { type: contentType });
  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'pdf';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!userId) return NextResponse.json({ error: 'Usuário é obrigatório.' }, { status: 400 });

    const sql = db();
    const users = await sql`SELECT * FROM naped_users WHERE id = ${Number(userId)} LIMIT 1`;
    const user = users[0];
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

    const rows = from && to
      ? await sql`SELECT * FROM naped_activities WHERE user_id = ${Number(userId)} AND activity_date BETWEEN ${from}::date AND ${to}::date ORDER BY activity_date`
      : await sql`SELECT * FROM naped_activities WHERE user_id = ${Number(userId)} ORDER BY activity_date`;

    const counts = new Map<string, number>();
    let totalMinutes = 0;
    for (const r of rows) {
      counts.set(safe(r.category), (counts.get(safe(r.category)) || 0) + 1);
      totalMinutes += Number(r.duration_minutes || 0);
    }
    const period = from && to ? `${from} a ${to}` : 'Todo o período registrado';

    if (format === 'docx') {
      const categoryRows = [...counts.entries()].map(([k, v]) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph(k)] }),
        new TableCell({ children: [new Paragraph(String(v))] })
      ] }));
      const activityRows = rows.map((r: any) => new TableRow({ children: [
        new TableCell({ children: [new Paragraph(safe(r.activity_date).slice(0,10))] }),
        new TableCell({ children: [new Paragraph(safe(r.category))] }),
        new TableCell({ children: [new Paragraph(safe(r.modality))] }),
        new TableCell({ children: [new Paragraph(safe(r.description || r.intervention))] })
      ] }));
      const doc = new Document({ sections: [{ children: [
        new Paragraph({ children: [new TextRun({ text: 'RELATÓRIO DE ATIVIDADES DO NAPED', bold: true, size: 30 })] }),
        new Paragraph(`Responsável: ${safe(user.name)}`),
        new Paragraph(`Função: ${safe(user.role)}`),
        new Paragraph(`Instituição: ${safe(user.institution)}`),
        new Paragraph(`Período: ${period}`),
        new Paragraph(''),
        new Paragraph({ children: [new TextRun({ text: 'Síntese', bold: true })] }),
        new Paragraph(`Total de atividades: ${rows.length}`),
        new Paragraph(`Carga horária registrada: ${(totalMinutes / 60).toFixed(1)} h`),
        new Paragraph(''),
        new Paragraph({ children: [new TextRun({ text: 'Distribuição por categoria', bold: true })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [new TableCell({ children: [new Paragraph('Categoria')] }), new TableCell({ children: [new Paragraph('Quantidade')] })] }),
          ...categoryRows
        ]}),
        new Paragraph(''),
        new Paragraph({ children: [new TextRun({ text: 'Atividades registradas', bold: true })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: ['Data','Categoria','Modalidade','Descrição'].map(t => new TableCell({ children: [new Paragraph(t)] })) }),
          ...activityRows
        ]}),
        new Paragraph(''),
        new Paragraph('Relatório gerado automaticamente pelo Sistema NAPED.')
      ] }] });
      const buffer = await Packer.toBuffer(doc);
      return binaryResponse(
        Uint8Array.from(buffer),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        `relatorio-naped-${userId}.docx`
      );
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const blue = rgb(0.04, 0.37, 0.66);
    let page = pdf.addPage([595, 842]);
    let y = 790;
    const line = (text: string, size = 10, isBold = false, indent = 0) => {
      if (y < 70) { page = pdf.addPage([595, 842]); y = 790; }
      page.drawText(text.slice(0, 105), { x: 48 + indent, y, size, font: isBold ? bold : font, color: isBold ? blue : rgb(0.12,0.17,0.22) });
      y -= size + 8;
    };
    page.drawText('RELATÓRIO DE ATIVIDADES DO NAPED', { x: 48, y, size: 18, font: bold, color: blue }); y -= 30;
    line(`Responsável: ${safe(user.name)}`); line(`Função: ${safe(user.role)}`); line(`Instituição: ${safe(user.institution)}`); line(`Período: ${period}`); y -= 8;
    line('Síntese', 12, true); line(`Total de atividades: ${rows.length}`); line(`Carga horária registrada: ${(totalMinutes/60).toFixed(1)} h`); y -= 8;
    line('Distribuição por categoria', 12, true);
    for (const [cat, qtd] of counts.entries()) line(`${cat}: ${qtd}`, 10, false, 10);
    y -= 8; line('Atividades registradas', 12, true);
    for (const r of rows as any[]) {
      line(`${safe(r.activity_date).slice(0,10)} | ${safe(r.category)} | ${safe(r.modality)}`, 9, true);
      const desc = safe(r.description || r.intervention || r.result);
      if (desc) {
        const words = desc.split(' '); let current = '';
        for (const w of words) { if ((current + ' ' + w).length > 90) { line(current, 9, false, 10); current = w; } else current += (current ? ' ' : '') + w; }
        if (current) line(current, 9, false, 10);
      }
      y -= 5;
    }
    const bytes = await pdf.save();
    return binaryResponse(bytes, 'application/pdf', `relatorio-naped-${userId}.pdf`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao gerar relatório.' }, { status: 500 });
  }
}
