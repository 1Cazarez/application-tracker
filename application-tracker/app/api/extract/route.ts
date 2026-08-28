import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createUserClient, getAccessToken } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req)
    if (!accessToken) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const supabase = createUserClient(accessToken)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('screenshot') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .maybeSingle()

    // Deliberately no environment fallback: extractions bill to the key that
    // makes them, so each user brings their own.
    const geminiKey = settings?.gemini_api_key
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'Add your own Gemini API key in Settings to extract from screenshots.', needsKey: true },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64
        }
      },
      {
        text: `Extract job listing details from this screenshot and return ONLY a JSON object with these fields:
        {
          "company": "",
          "title": "",
          "deadline": "",
          "pay": "",
          "location": "",
          "url": "",
          "job_type": ""
        }
        If a field is not found, leave it as an empty string.
        For deadline, format as YYYY-MM-DD if possible.
        Return ONLY the JSON, no explanation.`
      }
    ])

    const text = result.response.text()
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()
    const extracted = JSON.parse(cleaned)

    return NextResponse.json(extracted)
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json({ error: 'Failed to extract job details' }, { status: 500 })
  }
}
