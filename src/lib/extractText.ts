import { getDocument, PDFWorker } from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Run pdfjs in the main thread via MessageChannel — no real Worker thread needed.
// This is immune to iOS Safari module-worker bugs, service-worker interception,
// and any other environment-specific Worker restrictions.
//
// How it works:
//   port1 ←→ port2  (MessageChannel)
//   WorkerMessageHandler runs on port1 (worker side, in main thread)
//   PDFWorker communicates via port2 (main side)
let inlineWorker: PDFWorker | null = null

async function getInlinePdfWorker(): Promise<PDFWorker> {
  if (inlineWorker) return inlineWorker
  // Dynamic import so the 1.2 MB worker code only loads on first PDF upload
  // @ts-ignore — pdfjs worker typings not exposed from the main package
  const { WorkerMessageHandler } = await import('pdfjs-dist/build/pdf.worker.min.mjs')
  const { port1, port2 } = new MessageChannel()
  port1.start()
  port2.start()
  // initializeFromPort creates MessageHandler("worker","main",port1) internally
  // and sends the "ready" signal pdfjs expects
  WorkerMessageHandler.initializeFromPort(port1)
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
