import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { sendWhatsApp } from '../lib/helpers';
import { sendWelcomeEmail } from '../lib/email';
import jwt from 'jsonwebtoken';

import crypto from 'crypto';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('FATAL: JWT_SECRET não configurado no .env');
        return null;
    }
    return secret;
};

const generateShortCode = (length = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
};

export const requestClientLogin = async (req: Request, res: Response) => {
    try {
        const { shopId, phone, name, birthDate, justCheck } = req.body;
        if (!shopId || !phone) return res.status(400).json({ error: 'ShopId e Telefone são obrigatórios' });

        const secret = getJwtSecret();
        if (!secret) return res.status(500).json({ error: 'Erro de configuração no servidor (JWT_SECRET)' });

        const cleanPhone = phone.replace(/\D/g, '');
        
        let { data: client } = await supabaseAdmin.from('clients').select('*').eq('shop_id', shopId).eq('phone', cleanPhone).maybeSingle();
        
        if (!client) {
            if (justCheck) return res.json({ success: false, needsRegistration: true });
            if (!name) return res.status(400).json({ error: 'Nome é obrigatório para novo cadastro' });
            
            const { data: newClient, error } = await supabaseAdmin.from('clients').insert({ shop_id: shopId, name, phone: cleanPhone, birth_date: birthDate }).select('*').single();
            if (error) throw error;
            client = newClient;
        }

        const token = jwt.sign({ clientId: client.id, shopId, phone: cleanPhone }, secret, { expiresIn: '15m' });
        const { data: shop, error: shopError } = await supabaseAdmin.from('shops').select('name, slug, whatsapp_instance').eq('id', shopId).single();
        
        if (shopError || !shop) {
            console.error('[Auth] Erro ao buscar dados da loja:', shopError);
            return res.status(404).json({ error: 'Dados da loja não encontrados' });
        }

        // Gera código curto e salva no banco com o token JWT
        const code = generateShortCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

        const { error: codeError } = await supabaseAdmin.from('access_codes').insert({
            code,
            token,
            expires_at: expiresAt
        });

        if (codeError) {
            console.error('[Auth] Erro ao salvar access_code:', codeError);
            throw codeError;
        }

        const serverUrl = process.env.SERVER_URL || 'https://www.insightbarber.com.br';
        const loginUrl = `${serverUrl}/acesso/${code}`;
        const msg = `Olá ${client.name}!\nAcesse sua conta na ${shop.name} clicando no link abaixo:\n\n${loginUrl}\n\nEste link expira em 15 minutos. 🔐💈`;
        
        console.log(`[Auth] Enviando link de login para ${cleanPhone} (Loja: ${shop.name})`);
        const ok = await sendWhatsApp(cleanPhone, msg, shop.whatsapp_instance);
        
        if (ok) {
            res.json({ success: true, url: loginUrl });
        } else {
            console.error('[Auth] Falha ao enviar WhatsApp via Evolution API');
            res.status(500).json({ error: 'Falha ao enviar mensagem de WhatsApp. Verifique a conexão.' });
        }
    } catch (e: unknown) {
        console.error('[Auth] Error in requestClientLogin:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const validateClientToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

        const secret = getJwtSecret();
        if (!secret) return res.status(500).json({ error: 'Erro de configuração no servidor (JWT_SECRET)' });

        let jwtToken = token;

        // Verifica se é um código curto (não começa com "eyJ" que é típico de JWT)
        if (!token.startsWith('eyJ')) {
            const { data: accessCode, error: lookupError } = await supabaseAdmin
                .from('access_codes')
                .select('token, expires_at')
                .eq('code', token)
                .maybeSingle();

            if (lookupError || !accessCode) {
                return res.status(401).json({ error: 'Código de acesso inválido ou expirado' });
            }

            // Verifica expiração do código
            if (new Date(accessCode.expires_at) < new Date()) {
                // Remove código expirado
                await supabaseAdmin.from('access_codes').delete().eq('code', token);
                return res.status(401).json({ error: 'Código de acesso expirado. Solicite um novo link.' });
            }

            jwtToken = accessCode.token;

            // Remove o código após uso (single-use)
            await supabaseAdmin.from('access_codes').delete().eq('code', token);
        }

        const decoded = jwt.verify(jwtToken, secret) as any;
        
        const { data: client } = await supabaseAdmin.from('clients').select('*').eq('id', decoded.clientId).single();
        if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

        const { data: shop } = await supabaseAdmin.from('shops').select('slug').eq('id', decoded.shopId).single();
        
        res.json({ success: true, client, slug: shop?.slug, session: { token: jwtToken } });
    } catch (e: unknown) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

export const triggerWelcomeEmail = async (req: Request, res: Response) => {
    try {
        const { email, name, shopId } = req.body;
        if (!email || !name || !shopId) return res.status(400).json({ error: 'Dados incompletos' });

        // Verifica se já enviou via query rápida
        const { data: shop } = await supabaseAdmin.from('shops').select('welcome_email_sent').eq('id', shopId).single();
        if (shop?.welcome_email_sent) return res.json({ success: true, alreadySent: true });

        const sent = await sendWelcomeEmail(email, name);
        if (sent) {
            await supabaseAdmin.from('shops').update({ welcome_email_sent: true }).eq('id', shopId);
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Falha ao enviar e-mail' });
        }
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(400).json({ error: 'Token não fornecido' });

        const token = authHeader.split(' ')[1];

        // Decodifica a expiração do token (exp) sem validar assinatura (apenas leitura de metadados exp)
        const decoded = jwt.decode(token) as { exp?: number } | null;
        const expiresAt = decoded?.exp 
            ? new Date(decoded.exp * 1000).toISOString() 
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // fallback 24h

        // Insere na lista negra de tokens revogados
        const { error } = await supabaseAdmin.from('revoked_tokens').insert({
            token,
            expires_at: expiresAt
        });

        if (error && error.code !== '23505') { // ignora se o token já constar como revogado
            throw error;
        }

        res.json({ success: true, message: 'Sessão encerrada com sucesso' });
    } catch (e: unknown) {
        console.error('[Auth] Erro no logout:', e);
        const error = e instanceof Error ? e.message : 'Erro interno';
        res.status(500).json({ error });
    }
};

