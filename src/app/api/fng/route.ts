import { NextResponse } from 'next/server'

// alternative.me 对无尾部斜杠的路径返回 301 重定向，
// Next.js rewrite 无法透传该重定向，改用独立路由直接请求正确 URL
export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    if (!res.ok) {
      return NextResponse.json({ error: `upstream error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
