
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

const headers = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY,
    'User-Agent': 'CutFlow/1.0'
};

// 1 - Criar o Cliente no Asaas
export async function createAsaasCustomer(data: { name: string; cpfCnpj: string; email: string; phone?: string; mobilePhone?: string }) {
    const response = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
    }
    return result;
}

// 2 - Configurar Assinatura Recorrente no Asaas
export async function createAsaasSubscription(data: { customer: string; billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'; value: number; nextDueDate: string; description: string; cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' }) {
    const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas');
    }
    return result;
}

// Obter Assinaturas de um cliente
export async function getAsaasSubscriptions(customerId: string) {
    const response = await fetch(`${ASAAS_API_URL}/subscriptions?customer=${customerId}`, {
        method: 'GET',
        headers
    });
    const result = await response.json();
    if (!response.ok) throw new Error('Erro ao listar assinaturas');
    return result;
}

// 3 - Criar Pagamento Transparente
export async function createAsaasPayment(data: any) {
    const response = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao criar pagamento no Asaas');
    }
    return result;
}

// 4 - Obter QR Code PIX
export async function getAsaasPixQrCode(paymentId: string) {
    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
        method: 'GET',
        headers
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao obter QR Code PIX no Asaas');
    }
    return result;
}
