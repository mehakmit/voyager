import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: any) => item.str).join(' '))
  }

  return pages.join('\n')
}

export async function extractTextFromImage(file: File): Promise<string> {
  const worker = await createWorker('eng')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    return extractTextFromPDF(file)
  }
  if (file.type.startsWith('image/')) {
    return extractTextFromImage(file)
  }
  // Fallback: try to read as plain text
  return file.text()
}
