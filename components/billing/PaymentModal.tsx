import React, { useState } from 'react';
import { X, Check, QrCode, CreditCard, MessageCircle, ArrowLeft, Loader2, Copy } from 'lucide-react';
import { useShop } from '../../store';
import { useToast } from '../ui/ToastContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PLAN_PRICE = "R$ 59,90";
const PLAN_VALUE = 59.90;
const DEFAULT_LOGO = "https://iili.io/q2ivL1j.png";

type PaymentStep = 'plan_selection' | 'checkout_pix' | 'checkout_card' | 'success';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const { settings, shop } = useShop();
    const { showToast } = useToast();
    
    // States
    const [step, setStep] = useState<PaymentStep>('plan_selection');
    const [loading, setLoading] = useState(false);
    
    // Pix State
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

    const benefits = [
        "Agendamentos ilimitados",
        "Gestão de equipe e comissões",
        "Cupons de desconto ilimitados",
        "Link personalizado (sua-marca)",
        "Suporte prioritário via WhatsApp"
    ];

    const generatePix = async () => {
        setLoading(true);
        try {
            const customerParams = {
                name: settings.name || "Dono da Barbearia",
                email: settings.email || "contato@barbearia.com",
                cpfCnpj: "94285188049", // CPF Matemático válido para Sandbox para evitar bloqueio API Asaas
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
                        value: PLAN_VALUE
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
        } catch (error: any) {
            showToast(error.message, 'error');
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
                        value: PLAN_VALUE,
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
        } catch (error: any) {
             showToast(error.message, 'error');
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
            <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {step !== 'plan_selection' && step !== 'success' && !loading && (
                        <button onClick={() => setStep('plan_selection')} className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    {!loading && (
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto w-full scrollbar-hide flex-1">
                {step === 'plan_selection' && (
                    <>
                        <div className="p-8 text-center border-b border-slate-700 bg-slate-900/50">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20 overflow-hidden">
                                <img src={DEFAULT_LOGO} className="w-full h-full object-contain p-1" alt="Logo CutFlow" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Assine o CutFlow Barber</h2>
                            <p className="text-slate-400 mt-1">Gerencie seu negócio como um profissional</p>
                        </div>

                        <div className="p-8">
                            <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    RECOMENDADO
                                </div>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Plano Profissional</h3>
                                        <p className="text-slate-400 text-sm">Tudo o que você precisa</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-bold text-white">{PLAN_PRICE}</span>
                                        <span className="text-slate-500 text-sm">/mês</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            {benefit}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <button 
                                    onClick={generatePix}
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 flex items-center justify-center gap-3 text-white font-medium transition-all"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin text-orange-500" /> : <QrCode size={20} className="text-orange-500" />}
                                    <span>Pagar com PIX</span>
                                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded ml-auto">Instântaneo</span>
                                </button>
                                <button 
                                    onClick={() => setStep('checkout_card')}
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 flex items-center justify-center gap-3 text-slate-300 font-medium transition-all"
                                >
                                    <CreditCard size={20} />
                                    <span>Cartão de Crédito</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === 'checkout_pix' && pixData && (
                     <div className="p-8 flex flex-col items-center">
                         <h2 className="text-2xl font-bold text-white mb-2">Escaneie o QR Code</h2>
                         <p className="text-slate-400 text-center text-sm mb-6">Abra o app do seu banco e escaneie a imagem abaixo para ativar sua assinatura PIX.</p>
                         
                         <div className="bg-white p-4 rounded-xl shadow-inner mb-6 border border-slate-300">
                             <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="PIX QR Code" className="w-64 h-64 object-contain" />
                         </div>

                         <div className="w-full mb-6">
                             <label className="text-sm text-slate-400 font-medium mb-1 block">Pix Copia e Cola</label>
                             <div className="flex gap-2">
                                <input readOnly value={pixData.payload} className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm outline-none" />
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
                         <p className="text-slate-400 text-sm mb-6">Transação segura e criptografada via Asaas</p>
                         
                         <form onSubmit={processCreditCard} className="space-y-4">
                             <div>
                                 <label className="text-sm font-medium text-slate-300 mb-1 block">Número do Cartão</label>
                                 <input required value={cardForm.number} onChange={e => setCardForm({...cardForm, number: e.target.value})} type="text" placeholder="0000 0000 0000 0000" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1 block">Validade</label>
                                    <input required value={cardForm.expiry} onChange={e => setCardForm({...cardForm, expiry: e.target.value})} type="text" placeholder="MM/AA" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1 block">CVV</label>
                                    <input required value={cardForm.ccv} onChange={e => setCardForm({...cardForm, ccv: e.target.value})} type="text" placeholder="123" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                </div>
                             </div>

                             <div>
                                 <label className="text-sm font-medium text-slate-300 mb-1 block">Nome Impresso no Cartão</label>
                                 <input required value={cardForm.name} onChange={e => setCardForm({...cardForm, name: e.target.value.toUpperCase()})} type="text" placeholder="JOAO S SILVA" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                             </div>

                             <div className="pt-4 border-t border-slate-700 mt-2">
                                <p className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider">Dados do Titular</p>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">CPF/CNPJ</label>
                                            <input required value={cardForm.cpfCnpj} onChange={e => setCardForm({...cardForm, cpfCnpj: e.target.value})} type="text" placeholder="000.000.000-00" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">Telefone/Celular</label>
                                            <input required value={cardForm.phone} onChange={e => setCardForm({...cardForm, phone: e.target.value})} type="text" placeholder="(11) 99999-9999" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">CEP</label>
                                            <input required value={cardForm.postalCode} onChange={e => setCardForm({...cardForm, postalCode: e.target.value})} type="text" placeholder="00000-000" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-300 mb-1 block">Número Res.</label>
                                            <input required value={cardForm.addressNumber} onChange={e => setCardForm({...cardForm, addressNumber: e.target.value})} type="text" placeholder="123" className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-orange-500" />
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
                                 {loading ? 'Processando Pagamento...' : `Pagar ${PLAN_PRICE}`}
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
