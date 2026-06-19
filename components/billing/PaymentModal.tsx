import React, { useState } from 'react';
import { X, Check, QrCode, CreditCard, ArrowLeft, Loader2, Copy, Star } from 'lucide-react';
import { useShop } from '../../store';
import { useToast } from '../ui/ToastContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PLANS = [
    {
        id: 'essencial',
        name: 'Essencial',
        price: '59,90',
        value: 59.90,
        description: 'Até 2 profissionais',
        popular: false
    },
    {
        id: 'profissional',
        name: 'Profissional',
        price: '99,90',
        value: 99.90,
        description: 'Até 5 profissionais e ferramentas IA',
        popular: true
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '149,90',
        value: 149.90,
        description: 'Profissionais Ilimitados VIP',
        popular: false
    }
];

const DEFAULT_LOGO = "https://iili.io/q2ivL1j.png";

type PaymentStep = 'plan_selection' | 'checkout_pix' | 'checkout_card' | 'success';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const { settings, shop } = useShop();
    const { showToast } = useToast();
    
    // States
    const [step, setStep] = useState<PaymentStep>('plan_selection');
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(PLANS[1]); // Default ao Profissional
    
    // Pix State
    const [cpfPix, setCpfPix] = useState('');
    const [pixData, setPixData] = useState<{ payload: string, encodedImage: string } | null>(null);

    // CC Form State
    const [cardForm, setCardForm] = useState({
        number: '',
        name: '',
        expiry: '',
        ccv: '',
        cpfCnpj: '',
        postalCode: '',
        addressNumber: '',
        phone: ''
    });

    if (!isOpen) return null;

    const generatePix = async () => {
        if (!cpfPix || cpfPix.replace(/\D/g, '').length < 11) {
            showToast("Informe um CPF ou CNPJ válido antes de gerar o PIX.", "error");
            return;
        }

        setLoading(true);
        try {
            const customerParams = {
                name: settings.name || "Dono da Barbearia",
                email: settings.email || "contato@barbearia.com",
                cpfCnpj: cpfPix.replace(/\D/g, ''),
                phone: settings.phone || "11999999999"
            };

            const response = await fetch('/api/asaas/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopId: shop?.id,
                    customerParams,
                    paymentParams: {
                        billingType: 'PIX',
                        value: selectedPlan.value
                    }
                })
            });

            const data = await response.json();
            if (data.success && data.qrCode) {
                setPixData(data.qrCode);
                setStep('checkout_pix');
            } else {
                throw new Error(data.error || "Erro ao gerar PIX");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao gerar PIX";
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const processCreditCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Validate and extract expiry MM/AA or MM/AAAA
            const [expiryMonth, expiryYearRaw] = cardForm.expiry.split('/');
            if (!expiryMonth || !expiryYearRaw) {
                throw new Error("Data de expiração inválida. Use MM/AA ou MM/AAAA");
            }

            const expiryYear = expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;
            
            const customerParams = {
                name: cardForm.name,
                email: settings.email || "contato@barbearia.com",
                cpfCnpj: cardForm.cpfCnpj.replace(/\D/g, ''),
                phone: cardForm.phone.replace(/\D/g, '') || "11999999999"
            };

            const creditCard = {
                holderName: cardForm.name,
                number: cardForm.number.replace(/\D/g, ''),
                expiryMonth: expiryMonth,
                expiryYear: expiryYear,
                ccv: cardForm.ccv
            };

            const creditCardHolderInfo = {
                name: cardForm.name,
                email: customerParams.email,
                cpfCnpj: customerParams.cpfCnpj,
                postalCode: cardForm.postalCode.replace(/\D/g, ''),
                addressNumber: cardForm.addressNumber,
                phone: customerParams.phone
            };

            const response = await fetch('/api/asaas/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopId: shop?.id,
                    customerParams,
                    paymentParams: {
                        billingType: 'CREDIT_CARD',
                        value: selectedPlan.value,
                        creditCard,
                        creditCardHolderInfo
                    }
                })
            });

            const data = await response.json();
            if (data.success && data.payment?.status === 'CONFIRMED' || data.payment?.status === 'RECEIVED' || data.payment?.status === 'PENDING') {
                setStep('success'); // Assumes pending is successful creation
            } else {
                throw new Error(data.error || "Erro ao processar cartão.");
            }
        } catch (error) {
             const message = error instanceof Error ? error.message : "Erro ao processar cartão.";
             showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if(pixData?.payload) {
            navigator.clipboard.writeText(pixData.payload);
            showToast("Código Copia e Cola copiado!", "success");
        }
    }

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
        >
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-[#334155] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {step !== 'plan_selection' && step !== 'success' && !loading && (
                        <button onClick={() => setStep('plan_selection')} className="w-8 h-8 flex items-center justify-center bg-[#334155] rounded-full text-slate-300 hover:text-white transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    {!loading && (
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-[#334155] rounded-full text-slate-300 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto w-full scrollbar-hide flex-1">
                {step === 'plan_selection' && (
                    <>
                        <div className="p-8 text-center border-b border-[#334155] bg-[#0f172a]/50">
                            <h2 className="text-2xl font-bold text-white">Escolha um Plano</h2>
                            <p className="text-slate-400 mt-1 text-sm">Selecione o plano ideal para a sua barbearia</p>
                        </div>

                        <div className="p-6">
                            <div className="space-y-3 mb-6">
                                {PLANS.map((plan) => (
                                    <button 
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                                            selectedPlan.id === plan.id 
                                                ? 'bg-[#0f172a] border-orange-500 shadow-lg shadow-orange-500/10' 
                                                : 'bg-[#0f172a]/50 border-[#334155] hover:border-[#475569]'
                                        }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 uppercase">
                                                <Star size={10} fill="currentColor" /> Recomendado
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedPlan.id === plan.id ? 'border-orange-500' : 'border-slate-500'}`}>
                                                        {selectedPlan.id === plan.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                                    </div>
                                                    <h3 className="font-bold text-white">{plan.name}</h3>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 ml-6">{plan.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-bold text-white">R$ {plan.price}</span>
                                                <span className="text-slate-500 text-xs">/mês</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3 mb-2 pt-6 border-t border-[#334155]">
                                <div className="mb-4">
                                    <label className="text-sm text-slate-300 font-medium mb-1 block">Insira seu CPF ou CNPJ (obrigatório para NF/PIX)</label>
                                    <input 
                                        type="text" 
                                        placeholder="000.000.000-00" 
                                        value={cpfPix} 
                                        onChange={e => setCpfPix(e.target.value)} 
                                        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>

                                <button 
                                    onClick={generatePix}
                                    disabled={loading}
                                    className="w-full py-4 bg-[#334155] hover:bg-[#475569] rounded-xl border border-[#475569] flex items-center justify-center gap-3 text-white font-medium transition-all shadow-md"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin text-orange-500" /> : <QrCode size={20} className="text-orange-500" />}
                                    <span>Pagar com PIX</span>
                                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded ml-auto">Instântaneo</span>
                                </button>
                                <button 
                                    onClick={() => setStep('checkout_card')}
                                    disabled={loading}
                                    className="w-full py-4 bg-[#0f172a] hover:bg-[#1e293b] rounded-xl border border-[#334155] flex items-center justify-center gap-3 text-slate-300 font-medium transition-all"
                                >
                                    <CreditCard size={20} />
                                    <span>Pagar com Cartão de Crédito</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === 'checkout_pix' && pixData && (
                     <div className="p-8 flex flex-col items-center">
                         <h2 className="text-2xl font-bold text-white mb-2">Escaneie o QR Code</h2>
                         <p className="text-slate-400 text-center text-sm mb-6">Você está atinando o <b>Plano {selectedPlan.name}</b> (R$ {selectedPlan.price}). Abra o app para pagar.</p>
                         
                         <div className="bg-white p-4 rounded-xl shadow-inner mb-6 border border-slate-300">
                             <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="PIX QR Code" className="w-64 h-64 object-contain" />
                         </div>

                         <div className="w-full mb-6">
                             <label className="text-sm text-slate-400 font-medium mb-1 block">Pix Copia e Cola</label>
                             <div className="flex gap-2">
                                <input readOnly value={pixData.payload} className="w-full bg-[#0f172a] border border-[#334155] text-slate-300 rounded-lg px-4 py-2 text-sm outline-none" />
                                <button onClick={copyToClipboard} className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-lg flex items-center justify-center transition-colors">
                                    <Copy size={18} />
                                </button>
                             </div>
                         </div>

                         <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300 flex items-center gap-3 w-full">
                            <Loader2 className="shrink-0 animate-spin" size={20} />
                            <span>Aguardando a confirmação... Acesso liberado após a compensação.</span>
                         </div>
                     </div>
                )}

                {step === 'checkout_card' && (
                     <div className="p-8">
                         <h2 className="text-2xl font-bold text-white mb-1">Pagamento com Cartão</h2>
                         <p className="text-slate-400 text-sm mb-6">Você selecionou o <b>Plano {selectedPlan.name}</b>. Transação segura.</p>
                         
                         <form onSubmit={processCreditCard} className="space-y-4">
                             <div>
                                 <label className="text-sm font-medium text-slate-300 mb-1 block">Número do Cartão</label>
                                 <input required value={cardForm.number} onChange={e => setCardForm({...cardForm, number: e.target.value})} type="text" placeholder="0000 0000 0000 0000" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1 block">Validade</label>
                                    <input required value={cardForm.expiry} onChange={e => setCardForm({...cardForm, expiry: e.target.value})} type="text" placeholder="MM/AA" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1 block">CVV</label>
                                    <input required value={cardForm.ccv} onChange={e => setCardForm({...cardForm, ccv: e.target.value})} type="text" placeholder="123" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                </div>
                             </div>

                             <div>
                                 <label className="text-sm font-medium text-slate-300 mb-1 block">Nome Impresso no Cartão</label>
                                 <input required value={cardForm.name} onChange={e => setCardForm({...cardForm, name: e.target.value.toUpperCase()})} type="text" placeholder="JOAO S SILVA" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                             </div>

                             <div className="pt-4 border-t border-[#334155] mt-2">
                                <p className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Dados do Titular</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">CPF/CNPJ</label>
                                            <input required value={cardForm.cpfCnpj} onChange={e => setCardForm({...cardForm, cpfCnpj: e.target.value})} type="text" placeholder="000.000.000-00" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">Telefone/Celular</label>
                                            <input required value={cardForm.phone} onChange={e => setCardForm({...cardForm, phone: e.target.value})} type="text" placeholder="(11) 99999-9999" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">CEP</label>
                                            <input required value={cardForm.postalCode} onChange={e => setCardForm({...cardForm, postalCode: e.target.value})} type="text" placeholder="00000-000" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">Número Res.</label>
                                            <input required value={cardForm.addressNumber} onChange={e => setCardForm({...cardForm, addressNumber: e.target.value})} type="text" placeholder="123" className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                    </div>
                                </div>
                             </div>

                             <button 
                                 type="submit"
                                 disabled={loading}
                                 className="w-full py-4 mt-6 bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center justify-center gap-2 text-white font-bold transition-all shadow-lg active:scale-95"
                             >
                                 {loading && <Loader2 size={20} className="animate-spin" />}
                                 {loading ? 'Processando...' : `Pagar R$ ${selectedPlan.price}`}
                             </button>
                         </form>
                     </div>
                )}

                {step === 'success' && (
                     <div className="p-12 flex flex-col items-center justify-center text-center">
                         <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <Check size={48} className="text-green-500" />
                         </div>
                         <h2 className="text-3xl font-bold text-white mb-2">Sucesso!</h2>
                         <p className="text-slate-400 mb-8 max-w-xs">Seu pagamento está sendo processado. Sua assinatura foi ativada com sucesso.</p>
                         <button 
                            onClick={onClose}
                            className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                         >
                             Acessar Painel
                         </button>
                     </div>
                )}
                </div>
            </div>
        </div>
    );
};
