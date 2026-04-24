import { getDocument, PDFWorker } from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Run pdfjs in the main thread via MessageChannel instead of a real Worker thread.
// This avoids ALL module-worker issues (iOS Safari bugs, service-worker interception,
// MIME-type quirks) at the cost of briefly blocking the UI during parsing — acceptable
// for the small PDFs (< 200 KB) that travel e-tickets typically are.
let inlineWorker: PDFWorker | null = null

async function getInlinePdfWorker(): Promise<PDFWorker> {
  if (inlineWorker) return inlineWorker
  // Dynamic import so the 1.2 MB worker code is only fetched on first PDF upload
  // @ts-ignore — pdfjs worker module types are not exposed in the main package typings
  const { WorkerMessageHandler } = await import('pdfjs-dist/build/pdf.worker.min.mjs')
  const { port1, port2 } = new MessageChannel()
  port1.start()
  port2.start()
  WorkerMessageHandler.setup({ verbosity: 0 }, port1)
  inlineWorker = new PDFWorker({ port: port2 as any })
  return inlineWorker
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const worker = await getInlinePdfWorker()
  const pdf = await getDocument({ data: arrayBuffer, worker }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: any) => item.str).join(' '))
  }
  await pdf.destroy()
  return pages.join('\n')
}

export async function extractTextFromImage(file: File): Promise<string> {
  const worker = await createWorker('eng')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPDF(file)
  }
  if (file.type.startsWith('image/')) {
    return extractTextFromImage(file)
  }
  return file.text()
}
