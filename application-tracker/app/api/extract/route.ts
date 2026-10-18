import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createUserClient, getAccessToken } from '@/lib/supabase-server'
import { JOB_FIELDS, toJobFieldValues } from '@/lib/jobFields'

// date_applied isn't on the listing; the upload page fills it in with today.
const EXTRACTED_FIELDS = JOB_FIELDS.filter(field => field !== 'date_applied')

const PROMPT = `Extract job listing details from this screenshot and return ONLY a JSON object with these fields:
${JSON.stringify(Object.fromEntries(EXTRACTED_FIELDS.map(field => [field, ''])), null, 2)}
If a field is not found, leave it as an empty string.
For deadline, format as YYYY-MM-DD if possible.
Return ONLY the JSON, no explanation.`

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
    const file = formData.get('screenshot')
    if (!(file instanceof File)) {
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

    const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: 'gemini-2.5-flash' })
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

    const result = await model.generateContent([
      { inlineData: { mimeType: file.type, data: base64 } },
      { text: PROMPT },
    ])

    const cleaned = result.response.text().replace(/```json\n?|```\n?/g, '').trim()
    // Pass on only the known fields, as strings, whatever the model returned.
    return NextResponse.json(toJobFieldValues(JSON.parse(cleaned), EXTRACTED_FIELDS))
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json({ error: 'Failed to extract job details' }, { status: 500 })
  }
}
