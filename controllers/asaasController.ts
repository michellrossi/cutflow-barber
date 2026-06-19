import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { createAsaasCustomer, createAsaasSubscription, createAsaasPayment, getAsaasPixQrCode } from '../utils/asaas.js';
import crypto from 'crypto';

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, cpfCnpj } = req.body;
        const user = req.user;
        if (!user) return res.status(401).json({ error: 'User not authenticated' });
        
        const customer = await createAsaasCustomer({ name, phone, email, cpfCnpj });
        await supabaseAdmin.from('shops').update({ asaas_customer_id: customer.id }).eq('owner_id', user.id);
        res.json(customer);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const createSubscription = async (req: Request, res: Response) => {
    try {
        const { customerId, value, cycle, description, billingType, nextDueDate, planTier, shopId } = req.body;
        
        let externalReference: string | undefined = undefined;
        if (planTier || shopId) {
            externalReference = JSON.stringify({ planTier, shopId });
        }

        const sub = await createAsaasSubscription({ 
            customer: customerId, 
            value, 
            cycle, 
            description,
            billingType: billingType || 'PIX',
            nextDueDate: nextDueDate || new Date().toISOString(),
            externalReference
        });
        res.json(sub);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const checkout = async (req: Request, res: Response) => {
    try {
        const { value, description, customerId, planTier, shopId } = req.body;

        let externalReference: string | undefined = undefined;
        if (planTier || shopId) {
            externalReference = JSON.stringify({ planTier, shopId });
        }

        const payment = await createAsaasPayment({ 
            value, 
            description, 
            customerId,
            externalReference
        });
        if (payment.billingType === 'PIX') {
            const qrCode = await getAsaasPixQrCode(payment.id);
            return res.json({ payment, qrCode });
        }
        res.json(payment);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const receivedToken = req.headers['asaas-access-token'];
        const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

        if (!receivedToken || !expectedToken) return res.status(401).json({ error: 'Unauthorized' });

        const receivedBuffer = Buffer.from(receivedToken as string);
        const expectedBuffer = Buffer.from(expectedToken);

        if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const event = req.body.event;
        const payment = req.body.payment;

        // Idempotência preventiva no início
        const eventId = req.body.id || payment?.id;
        if (!eventId) {
            return res.status(400).json({ error: 'ID de evento do webhook não fornecido' });
        }

        try {
            const { error: insertError } = await supabaseAdmin.from('webhook_events').insert({ 
                provider: 'asaas', 
                event_type: event, 
                external_id: eventId, 
                payload: req.body 
            });

            if (insertError) {
                if (insertError.code === '23505') {
                    console.log(`[Asaas Webhook] Evento duplicado detectado via restrição UNIQUE: ${eventId}`);
                    return res.status(200).send('OK (duplicate)');
                }
                throw insertError;
            }
        } catch (dbError) {
            console.error('[Asaas Webhook] Erro ao registrar idempotência do evento:', dbError);
            return res.status(500).json({ error: 'Erro ao processar verificação de duplicidade de webhook' });
        }

        // Proteção contra transações muito antigas / auditoria de tempo
        const paymentDate = payment?.dateCreated ? new Date(payment.dateCreated) : null;
        if (paymentDate) {
            const ageMs = Date.now() - paymentDate.getTime();
            const ONE_DAY = 24 * 60 * 60 * 1000;
            if (ageMs > ONE_DAY) {
                console.warn(`[Asaas Webhook] Recebido webhook para pagamento antigo (mais de 24 horas): ${payment.id}, idade: ${Math.round(ageMs / 3600000)}h`);
            }
        }

        if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('asaas_customer_id', payment.customer).maybeSingle();
            if (shop) {
                let planTier: string = 'essencial'; // Tier padrão seguro
                
                try {
                    // Tenta ler o externalReference estruturado em JSON
                    const ref = JSON.parse(payment?.externalReference || '{}');
                    const validTiers = ['essencial', 'profissional', 'premium'] as const;
                    if (ref.planTier && validTiers.includes(ref.planTier)) {
                        planTier = ref.planTier;
                    } else {
                        // Fallback para descrição legado
                        const description = (payment?.description || '').toLowerCase().trim();
                        if (description.includes('premium')) planTier = 'premium';
                        else if (description.includes('profissional')) planTier = 'profissional';
                        else if (description.includes('basico') || description.includes('essencial')) planTier = 'essencial';
                        else {
                            console.warn(`[Asaas Webhook] planTier não reconhecido na descrição: "${payment?.description}", usando 'essencial'`);
                        }
                    }
                } catch {
                    // Fallback para descrição legado caso o JSON seja inválido
                    const description = (payment?.description || '').toLowerCase().trim();
                    if (description.includes('premium')) planTier = 'premium';
                    else if (description.includes('profissional')) planTier = 'profissional';
                    else if (description.includes('basico') || description.includes('essencial')) planTier = 'essencial';
                    else {
                        console.warn(`[Asaas Webhook] Falha ao parsear externalReference, fallback para descrição falhou. Usando 'essencial'`);
                    }
                }

                await supabaseAdmin.from('shops').update({ 
                    plan: 'active', 
                    plan_tier: planTier,
                    payment_confirmed_at: new Date().toISOString() 
                }).eq('id', shop.id);
                console.log(`[Asaas] Plano ${planTier} da barbearia ${shop.name} ATIVADO.`);
            }
        } else if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_DELETED') {
            const customerId = payment?.customer || req.body.subscription?.customer;
            if (customerId) {
                const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('asaas_customer_id', customerId).maybeSingle();
                if (shop) {
                    await supabaseAdmin.from('shops').update({ plan: 'suspended' }).eq('id', shop.id);
                    console.warn(`[Asaas] Plano da barbearia ${shop.name} SUSPENSO por inadimplência/cancelamento.`);
                }
            }
        }

        res.status(200).send('OK');
    } catch (e: unknown) {
        console.error('[Asaas Webhook Error]', e);
        const error = e instanceof Error ? e.message : 'Erro interno';
        res.status(500).json({ error });
    }
};
