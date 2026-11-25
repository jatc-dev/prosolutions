import {
  AiBusyError,
  AiUnavailableError,
  GROQ_ENDPOINT,
  improveCvText,
  isAiConfigured,
  NUMBER_PLACEHOLDER,
  resolveAiModel,
  resolveAiProvider,
  setGroqFetchForTests,
} from '../../src/services/aiAssistantService';

const KEYS = ['AI_PROVIDER', 'AI_MODEL', 'GROQ_API_KEY', 'ANTHROPIC_API_KEY'] as const;

function groqReply(content: unknown, init: { status?: number; finish?: string } = {}) {
  const body = {
    model: 'openai/gpt-oss-120b',
    choices: [
      {
        finish_reason: init.finish ?? 'stop',
        message: { content: typeof content === 'string' ? content : JSON.stringify(content) },
      },
    ],
    usage: { prompt_tokens: 120, completion_tokens: 60 },
  };
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AI provider selection', () => {
  it('uses the provider whose key is configured, Anthropic first, and honours AI_PROVIDER', () => {
    expect(resolveAiProvider({})).toBeNull();
    expect(resolveAiProvider({ GROQ_API_KEY: 'g' })).toBe('groq');
    expect(resolveAiProvider({ GROQ_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' })).toBe('anthropic');
    expect(
      resolveAiProvider({ GROQ_API_KEY: 'g', ANTHROPIC_API_KEY: 'a', AI_PROVIDER: 'groq' }),
    ).toBe('groq');
    // An explicit provider without its key is not silently swapped for another one.
    expect(resolveAiProvider({ ANTHROPIC_API_KEY: 'a', AI_PROVIDER: 'groq' })).toBeNull();
  });

  it('picks a default model per provider and validates overrides', () => {
    expect(resolveAiModel({}, 'groq')).toBe('openai/gpt-oss-120b');
    expect(resolveAiModel({ AI_MODEL: 'qwen/qwen3-32b' }, 'groq')).toBe('qwen/qwen3-32b');
    expect(resolveAiModel({ AI_MODEL: 'bad model!' }, 'groq')).toBe('openai/gpt-oss-120b');
    expect(resolveAiModel({}, 'anthropic')).toBe('claude-sonnet-5-5');
  });
});

describe('Groq provider', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    process.env.GROQ_API_KEY = 'gsk_test';
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    setGroqFetchForTests(null);
  });

  const input = {
    section: 'summary' as const,
    instruction: 'Hazlo más profesional',
    text: 'Vendedor con 3 años de experiencia en tiendas de ropa.',
    cvContext: 'Experience: Vendedor | Almacenes Éxito | 2021 - present',
  };

  it('sends a strict JSON-schema request and keeps the anti-invention guardrail', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      groqReply({
        suggestion: 'Vendedor con 3 años de experiencia que aumentó las ventas un 40 %.',
        changes: ['Verbo más fuerte'],
        needsUserInput: [],
      }),
    );
    setGroqFetchForTests(fetchMock as unknown as typeof fetch);

    expect(isAiConfigured()).toBe(true);
    const result = await improveCvText(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(GROQ_ENDPOINT);
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('openai/gpt-oss-120b');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.required).toEqual([
      'suggestion',
      'changes',
      'needsUserInput',
    ]);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain('Vendedor con 3 años');

    // "40 %" was never provided by the user: it must not reach the CV.
    expect(result.suggestion).toContain(NUMBER_PLACEHOLDER);
    expect(result.suggestion).toContain('3 años');
    expect(result.unverifiedFigures).toEqual(['40 %']);
  });

  it('maps rate limits, bad credentials and malformed answers to typed errors', async () => {
    setGroqFetchForTests(
      jest.fn().mockResolvedValue(groqReply({}, { status: 429 })) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiBusyError);

    setGroqFetchForTests(
      jest.fn().mockResolvedValue(groqReply({}, { status: 401 })) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiUnavailableError);

    setGroqFetchForTests(
      jest.fn().mockResolvedValue(groqReply('not json')) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiUnavailableError);

    setGroqFetchForTests(
      jest.fn().mockResolvedValue(groqReply({ suggestion: 'x' })) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiUnavailableError);

    setGroqFetchForTests(
      jest
        .fn()
        .mockResolvedValue(
          groqReply({ suggestion: 'x', changes: [], needsUserInput: [] }, { finish: 'length' }),
        ) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiUnavailableError);

    setGroqFetchForTests(
      jest.fn().mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch,
    );
    await expect(improveCvText(input)).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
