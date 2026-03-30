import { Appointment, Client, Professional, Service } from '../types';

export const formatMessage = (
  template: string,
  data: {
    client?: Client | { name: string; phone: string };
    appointment?: Appointment;
    professional?: Professional;
    services?: Service[];
    shopName?: string;
  }
) => {
  let message = template;

  const { client, appointment, professional, services, shopName } = data;

  // Replace variables
  const replacements: { [key: string]: string } = {
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

export const getWhatsAppLink = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
