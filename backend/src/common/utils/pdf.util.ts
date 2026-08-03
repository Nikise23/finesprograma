import PDFDocument from 'pdfkit';

export function buildPdf(write: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    write(doc);
    doc.end();
  });
}

export function pdfTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  opts?: { title?: string },
) {
  if (opts?.title) {
    doc.fontSize(16).font('Helvetica-Bold').text(opts.title);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`Generado: ${new Date().toLocaleString('es-AR')}`);
    doc.moveDown(1);
    doc.fillColor('#000');
  }

  const colWidth = (doc.page.width - 80) / headers.length;
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h, 40 + i * colWidth, y, { width: colWidth - 4 }));
  y += 16;
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
  y += 6;

  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    row.forEach((cell, i) => doc.text(cell ?? '', 40 + i * colWidth, y, { width: colWidth - 4 }));
    y += 14;
  }
}
