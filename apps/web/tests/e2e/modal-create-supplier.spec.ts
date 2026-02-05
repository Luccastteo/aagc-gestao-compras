import { test, expect } from '@playwright/test';

test.describe('Modal Create Supplier', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#login-email', 'manager@demo.com');
    await page.fill('#login-password', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for auth to complete
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Navigate directly to suppliers
    await page.goto('/app/suppliers');
    await page.waitForLoadState('networkidle');
  });

  test('should close modal after successful creation', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Fornecedor")');
    
    // Wait for modal to be visible
    await expect(page.locator('text=Criar Novo Fornecedor')).toBeVisible();
    
    // Fill valid data
    const uniqueName = `Fornecedor Test ${Date.now()}`;
    await page.fill('input[name="nome"]', uniqueName);
    await page.fill('input[name="cnpj"]', '12345678000190');
    await page.fill('input[name="contato"]', 'contato@test.com');
    await page.fill('input[name="telefone"]', '(11) 99999-9999');
    await page.fill('input[name="endereco"]', 'Rua Teste, 123');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Criar")');
    
    // Wait for success and modal to close
    await expect(page.locator('text=Criar Novo Fornecedor')).not.toBeVisible({ timeout: 5000 });
    
    // Verify supplier appears in list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
  });

  test('should keep modal open and show error on validation failure', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Fornecedor")');
    await expect(page.locator('text=Criar Novo Fornecedor')).toBeVisible();
    
    // Fill with invalid CNPJ (too short)
    await page.fill('input[name="nome"]', 'Test Supplier');
    await page.fill('input[name="cnpj"]', '123'); // INVALID
    
    // Submit
    await page.click('button[type="submit"]:has-text("Criar")');
    
    // Modal should stay open
    await expect(page.locator('text=Criar Novo Fornecedor')).toBeVisible();
    
    // Error message should appear
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
  });

  test('should reset form and close on cancel', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Fornecedor")');
    await expect(page.locator('text=Criar Novo Fornecedor')).toBeVisible();
    
    // Fill some data
    await page.fill('input[name="nome"]', 'Test Supplier');
    
    // Click cancel or close button
    const closeButton = page.locator('button:has-text("Cancelar")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try X button
      await page.click('button:has(svg)');
    }
    
    // Modal should close
    await expect(page.locator('text=Criar Novo Fornecedor')).not.toBeVisible();
  });
});
