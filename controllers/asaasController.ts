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
        const { customerId, value, cycle, description, billingType, nextDueDate } = req.body;
        const sub = await createAsaasSubscription({ 
            customer: customerId, 
            value, 
            cycle, 
            description,
            billingType: billingType || 'PIX',
            nextDueDate: nextDueDate || new Date().toISOString()
        });
        res.json(sub);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const checkout = async (req: Request, res: Response) => {
    try {
        const { value, description, customerId } = req.body;
        const payment = await createAsaasPayment({ value, description, customerId });
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

    // Idempotência
    const { data: existingEvent } = await supabaseAdmin.from('webhook_events').select('id').eq('external_id', req.body.id || payment?.id).maybeSingle();
    if (existingEvent) return res.status(200).send('OK (duplicate)');

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('asaas_customer_id', payment.customer).maybeSingle();
        if (shop) {
            // Extrai o tier da descrição ou externalReference (ex: "Plano Profissional")
            const description = (payment.description || '').toLowerCase();
            let planTier = 'trial';
            if (description.includes('premium')) planTier = 'premium';
            else if (description.includes('profissional')) planTier = 'profissional';
            else if (description.includes('basico')) planTier = 'basico';

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

    await supabaseAdmin.from('webhook_events').insert({ 
        provider: 'asaas', 
        event_type: event, 
        external_id: req.body.id || payment?.id, 
        payload: req.body 
    });

    res.status(200).send('OK');
};
