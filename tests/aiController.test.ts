import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks simples e diretos
const mockSendMessage = vi.fn().mockResolvedValue({ response: { text: () => 'insight response' } });
const mockStartChat = vi.fn().mockReturnValue({ sendMessage: mockSendMessage });
const mockGetGenerativeModel = vi.fn().mockReturnValue({ startChat: mockStartChat });

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel;
    }
  };
});

// Importar os controllers
import { getInsights, generateImage } from '../controllers/aiController';

const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as any;
};

describe('aiController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    
    mockGetGenerativeModel.mockReturnValue({ startChat: mockStartChat });
    mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });
    mockSendMessage.mockResolvedValue({ response: { text: () => 'insight response' } });
  });

  describe('getInsights', () => {
    it('deve processar o prompt e retornar sucesso', async () => {
      const req = { body: { prompt: 'test', context: {}, history: [] } } as any;
      const res = makeRes();

      await getInsights(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('deve limitar o histórico às últimas 10 mensagens', async () => {
      const longHistory = Array(20).fill({ role: 'user', content: 'hi' });
      const req = { body: { prompt: 'test', context: {}, history: longHistory } } as any;
      const res = makeRes();

      await getInsights(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      
      // Validar se o startChat foi chamado com o histórico limitado
      const chatArgs = mockStartChat.mock.calls[0][0];
      expect(chatArgs.history.length).toBe(10);
    });
  });

  describe('generateImage', () => {
    it('deve retornar a imagem em base64 baixada do Pollinations AI', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'image/jpeg'
        },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      }));

      const req = { body: { prompt: 'uma barbearia' } } as any;
      const res = makeRes();

      await generateImage(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        image: expect.stringContaining('data:image/jpeg;base64,')
      }));

      vi.unstubAllGlobals();
    });
  });
});
