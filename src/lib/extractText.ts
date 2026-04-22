import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Fixed URL — file copied to public/ so it never gets a new content hash.
// A hashed URL changes every build, requiring the service worker to re-download
// and cache it before the first upload can succeed. A fixed URL is cached once
// and stays valid across all future deployments (only changes when pdfjs-dist
// version bumps).
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadTask = getDocument({ data: arrayBuffer })
  const pdf = await Promise.race([
    loadTask.promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => { loadTask.destroy(); reject(new Error('PDF worker timed out')) }, 12000)
    ),
  ])
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
