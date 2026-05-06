import { test, expect } from '@playwright/test';

test.describe('Fluxo de Agendamento Completo', () => {
  test('deve realizar um agendamento com sucesso', async ({ page }) => {
    // 1. Acessa a página inicial (usando uma barbearia de teste se necessário)
    await page.goto('/');

    // 2. Clica no botão de Agendar (Step: Home)
    const agendarBtn = page.getByRole('button', { name: /agendar/i });
    await expect(agendarBtn).toBeVisible();
    await agendarBtn.click();

    // 3. Login (Step: Login) - Se não estiver logado
    // Como é um teste E2E real, vamos simular o preenchimento do telefone
    // Mas para este exemplo, vamos assumir que o usuário já está no fluxo de serviços
    // Ou preenchemos os dados de teste
    if (await page.getByPlaceholder('Digite seu telefone').isVisible()) {
        await page.getByPlaceholder('Digite seu telefone').fill('11999999999');
        await page.getByRole('button', { name: /entrar/i }).click();
    }

    // 4. Seleção de Serviços (Step: Services)
    // Espera os serviços carregarem
    await expect(page.getByText(/selecione os serviços/i)).toBeVisible();
    // Clica no primeiro serviço disponível
    await page.locator('.service-card').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 5. Seleção de Profissional (Step: Professional)
    await expect(page.getByText(/escolha o profissional/i)).toBeVisible();
    await page.locator('.professional-card').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 6. Seleção de Data e Hora (Step: DateTime)
    await expect(page.getByText(/data e horário/i)).toBeVisible();
    // Seleciona o primeiro dia disponível e o primeiro horário
    await page.locator('.day-selector').first().click();
    await page.locator('.time-slot:not(.disabled)').first().click();
    await page.getByRole('button', { name: /continuar/i }).click();

    // 7. Resumo e Confirmação (Step: Summary)
    await expect(page.getByText(/confirme seu agendamento/i)).toBeVisible();
    await page.getByRole('button', { name: /confirmar agendamento/i }).click();

    // 8. Sucesso (Step: Success)
    await expect(page.getByText(/agendamento realizado/i)).toBeVisible();
  });
});
