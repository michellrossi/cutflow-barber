import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../../lib/supabase';

test.describe('Fluxo de Agendamento Completo', () => {
  // Limpeza (Teardown) pós-teste: remove agendamentos e o cliente criados durante o teste
  test.afterAll(async () => {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('phone', '11999999999')
      .maybeSingle();

    if (client) {
      // Remove agendamentos criados para este cliente
      await supabaseAdmin
        .from('appointments')
        .delete()
        .eq('client_id', client.id);

      // Remove o próprio cliente de teste
      await supabaseAdmin
        .from('clients')
        .delete()
        .eq('id', client.id);
    }
  });

  test('deve realizar um agendamento com sucesso', async ({ page }) => {
    // 1. Acessa a página de agendamento da barbearia
    await page.goto('/agendar/barbershop');

    // 2. Clica no botão de Agendar (Step: Home)
    const agendarBtn = page.getByRole('button', { name: 'AGENDAR AGORA', exact: true });
    await expect(agendarBtn).toBeVisible();
    await agendarBtn.click();

    // 3. Login com OTP Real (Step: Login)
    const phoneInput = page.getByPlaceholder('(00) 00000-0000');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
    await phoneInput.fill('11999999999');
    await page.getByRole('button', { name: /avançar/i }).click();

    // Aguarda a inserção do código no backend e navega para a rota de validação de acesso
    await page.waitForTimeout(1000);
    const testOtp = process.env.TEST_CLIENT_OTP || 'TESTCODE';
    await page.goto(`/acesso/${testOtp}`);

    // Aguarda a validação do token e o redirecionamento de volta ao agendamento
    await expect(page.getByText(/acesso concedido/i)).toBeVisible();
    await page.waitForTimeout(2000); // tempo do redirecionamento

    // 3.5 Clica em agendar novamente (já logado) para ir para a seleção de serviços
    const agendarBtn2 = page.getByRole('button', { name: 'AGENDAR AGORA', exact: true });
    await expect(agendarBtn2).toBeVisible();
    await agendarBtn2.click();

    // 4. Seleção de Serviços (Step: Services)
    await expect(page.getByText(/escolha seus serviços/i)).toBeVisible();
    // Clica no primeiro serviço disponível
    await page.locator('.service-card').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 5. Seleção de Profissional (Step: Professional)
    await expect(page.getByText(/escolha o profissional/i)).toBeVisible();
    await page.locator('.professional-card').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 6. Seleção de Data e Hora (Step: DateTime)
    await expect(page.getByText(/data e horário/i)).toBeVisible();
    // Seleciona o segundo dia disponível (amanhã, para garantir que tenha horários livres mesmo rodando à noite) e o primeiro horário
    await page.locator('.day-selector').nth(1).click();
    await page.locator('.time-slot:not(.disabled)').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 7. Resumo e Confirmação (Step: Summary)
    await expect(page.getByText(/finalizar agendamento/i)).toBeVisible();
    
    // Preenche a data de nascimento para passar na validação de dados do cliente
    await page.locator('input[type="date"]').fill('1990-01-01');

    await page.getByRole('button', { name: /confirmar agendamento/i }).click();

    // 8. Sucesso (Step: Success)
    await expect(page.getByText(/agendamento confirmado/i)).toBeVisible();
  });
});
