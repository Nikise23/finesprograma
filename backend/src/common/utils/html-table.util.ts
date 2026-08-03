import * as fs from 'fs';

/** Parsea filas de una tabla HTML exportada como .xls */
export function parseHtmlTable(html: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(html))) {
    const cells: string[] = [];
    const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch: RegExpExecArray | null;

    while ((tdMatch = tdRegex.exec(trMatch[1]))) {
      cells.push(
        tdMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\\"/g, '')
          .replace(/"/g, '')
          .trim(),
      );
    }
    if (cells.length) rows.push(cells);
  }

  return rows;
}

export function readHtmlXls(filePath: string): string[][] {
  const html = fs.readFileSync(filePath, 'latin1');
  return parseHtmlTable(html);
}
