import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('screenshot') as File
    const userId = formData.get('userId') as string
   
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', userId)
        .single()

    if (!settings?.gemini_api_key) {
      return NextResponse.json({ error: 'No Gemini API key found. Please add one in Settings.' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(settings.gemini_api_key)
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