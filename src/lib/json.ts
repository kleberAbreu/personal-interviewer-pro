// Extração robusta de JSON da resposta de qualquer provedor:
// remove cercas markdown, localiza o objeto e tenta reparar truncamentos.

function tryRepair(str: string): string {
  const cleaned = str.trim()
  const open = (cleaned.match(/\{/g) || []).length
  const close = (cleaned.match(/\}/g) || []).length
  const openB = (cleaned.match(/\[/g) || []).length
  const closeB = (cleaned.match(/\]/g) || []).length
  if (open === close && openB === closeB) return cleaned

  let padding = ''
  const quotes = (cleaned.match(/(?<!\\)"/g) || []).length
  if (quotes % 2 !== 0) padding += '"'
  for (let i = 0; i < openB - closeB; i++) padding += ']'
  for (let i = 0; i < open - close; i++) padding += '}'
  return cleaned + padding
}

export function extractJson<T>(raw: string): T {
  if (!raw) throw new Error('Resposta vazia do modelo')
  let cleaned = raw.trim()

  // Remove cercas ```json ... ```
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n')
    const lastFence = cleaned.lastIndexOf('```')
    if (firstNewline !== -1) {
      cleaned = lastFence > firstNewline
        ? cleaned.substring(firstNewline + 1, lastFence)
        : cleaned.substring(firstNewline + 1)
    }
  }

  // Trunca floats com precisão patológica (ex: 1.000000000...)
  cleaned = cleaned.replace(/(\d+\.\d{3})\d+/g, '$1')

  const first = cleaned.indexOf('{')
  if (first === -1) throw new Error('Nenhum JSON encontrado na resposta')
  const last = cleaned.lastIndexOf('}')
  if (last > first) {
    const candidate = cleaned.substring(first, last + 1)
    try {
      return JSON.parse(candidate) as T
    } catch {
      // tenta reparo abaixo
    }
  }
  return JSON.parse(tryRepair(cleaned.substring(first))) as T
}
