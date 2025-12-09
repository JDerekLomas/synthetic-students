import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, systemPrompt, userPrompt, temperature } = await request.json();

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: temperature ?? 0.5,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  } catch (error) {
    console.error('Calibration API error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
