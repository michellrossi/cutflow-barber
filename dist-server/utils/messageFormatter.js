export const formatMessage = (template, data) => {
    let message = template;
    const { client, appointment, professional, services, shopName } = data;
    // Replace variables
    const replacements = {
        '[CLIENTE]': client?.name || '',
        '[SERVICO]': services?.map(s => s.name).join(', ') || '',
        '[DATA]': appointment ? new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
        '[HORA]': appointment?.time || '',
        '[BARBEIRO]': professional?.name || '',
        '[BARBEARIA]': shopName || ''
    };
    Object.keys(replacements).forEach(key => {
        const value = replacements[key];
        // Use a global regex to replace all occurrences
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey, 'g');
        message = message.replace(regex, value);
    });
    return message;
};
export const getWhatsAppLink = (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
