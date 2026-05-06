import { Resend } from 'resend';

let resend: Resend | null = null;

const getResendClient = () => {
    if (!resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('[Email] RESEND_API_KEY não configurada. E-mails não serão enviados.');
            return null;
        }
        resend = new Resend(apiKey);
    }
    return resend;
};

export const sendWelcomeEmail = async (email: string, name: string) => {
    try {
        const client = getResendClient();
        if (!client) return false;

        const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        await client.emails.send({
            from,
            to: email,
            subject: 'Bem-vindo ao CutFlow! 💈',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #f97316;">Olá, ${name}!</h1>
                    <p>Estamos muito felizes em ter você no <strong>CutFlow</strong>.</p>
                    <p>Sua conta foi confirmada com sucesso. Agora você já pode configurar sua barbearia, adicionar serviços e começar a receber agendamentos automatizados.</p>
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Próximos passos:</h3>
                        <ol>
                            <li>Acesse seu painel administrativo.</li>
                            <li>Conecte seu WhatsApp na aba "Configurações".</li>
                            <li>Configure seus horários e serviços.</li>
                        </ol>
                    </div>
                    <p>Se tiver qualquer dúvida, basta responder a este e-mail.</p>
                    <p>Boas vendas!<br>Equipe CutFlow</p>
                </div>
            `
        });
        
        console.log(`[Email] Welcome email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('[Email] Error sending welcome email:', error);
        return false;
    }
};
