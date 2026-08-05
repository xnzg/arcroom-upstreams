// POSIX path helpers. This repo deliberately has zero third-party dependencies:
// the build script has to still run years from now, from a bare checkout, with
// nothing but a Deno binary and the Xcode CLI tools.

function normalize(path: string): string {
  const absolute = path.startsWith('/')
  const out: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..' && out.length > 0 && out.at(-1) !== '..') {
      out.pop()
      continue
    }
    if (segment === '..' && absolute) continue
    out.push(segment)
  }
  return (absolute ? '/' : '') + out.join('/')
}

export function join(...parts: string[]): string {
  return normalize(parts.filter((part) => part !== '').join('/'))
}

export function basename(path: string): string {
  return path.split('/').filter((segment) => segment !== '').at(-1) ?? ''
}

export function resolve(path: string): string {
  return path.startsWith('/') ? normalize(path) : join(Deno.cwd(), path)
}
