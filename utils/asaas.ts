const getApiUrl = () => process.env.ASAAS_ENV === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : (process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3');

console.log(`[Asaas] Usando ambiente: ${process.env.ASAAS_ENV === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}`);

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY || '',
    'User-Agent': 'InsightBarber/1.0'
});

// 1 - Criar o Cliente no Asaas
export async function createAsaasCustomer(data: { name: string; cpfCnpj: string; email: string; phone?: string; mobilePhone?: string }) {
    const response = await fetch(`${getApiUrl()}/customers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
    }
    return result;
}

// 2 - Configurar Assinatura Recorrente no Asaas
export async function createAsaasSubscription(data: { customer: string; billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'; value: number; nextDueDate: string; description: string; cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'; externalReference?: string }) {
    const response = await fetch(`${getApiUrl()}/subscriptions`, {
        method: 'POST',
        headers: getHeaders(),
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
    const response = await fetch(`${getApiUrl()}/subscriptions?customer=${customerId}`, {
        method: 'GET',
        headers: getHeaders()
    });
    const result = await response.json();
    if (!response.ok) throw new Error('Erro ao listar assinaturas');
    return result;
}

export interface AsaasPaymentData {
    customer?: string;
    billingType?: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    dueDate?: string;
    description?: string;
    creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        phone: string;
    };
    externalReference?: string;
    [key: string]: unknown;
}

// 3 - Criar Pagamento Transparente
export async function createAsaasPayment(data: AsaasPaymentData) {
    const response = await fetch(`${getApiUrl()}/payments`, {
        method: 'POST',
        headers: getHeaders(),
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
    const response = await fetch(`${getApiUrl()}/payments/${paymentId}/pixQrCode`, {
        method: 'GET',
        headers: getHeaders()
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.errors?.[0]?.description || 'Erro ao obter QR Code PIX no Asaas');
    }
    return result;
}
