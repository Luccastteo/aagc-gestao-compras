import { test, expect } from '@playwright/test';

test.describe('Modal Create Item', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#login-email', 'manager@demo.com');
    await page.fill('#login-password', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for auth to complete
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Navigate directly to inventory
    await page.goto('/app/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('should close modal after successful creation', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Item")');
    
    // Wait for modal to be visible
    await expect(page.locator('text=Criar Novo Item')).toBeVisible();
    
    // Fill valid data
    await page.fill('input[name="sku"]', `TEST-${Date.now()}`);
    await page.fill('input[name="descricao"]', 'Test Item');
    await page.fill('input[name="categoria"]', 'Test Category');
    await page.fill('input[name="saldo"]', '10');
    await page.fill('input[name="minimo"]', '5');
    await page.fill('input[name="maximo"]', '20');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Criar")');
    
    // Wait for success and modal to close
    await expect(page.locator('text=Criar Novo Item')).not.toBeVisible({ timeout: 5000 });
    
    // Verify item appears in list
    await expect(page.locator('text=Test Item')).toBeVisible();
  });

  test('should keep modal open and show error on validation failure', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Item")');
    await expect(page.locator('text=Criar Novo Item')).toBeVisible();
    
    // Fill with negative stock (invalid)
    await page.fill('input[name="sku"]', `TEST-${Date.now()}`);
    await page.fill('input[name="descricao"]', 'Test Item');
    await page.fill('input[name="saldo"]', '-10'); // INVALID
    
    // Submit
    await page.click('button[type="submit"]:has-text("Criar")');
    
    // Modal should stay open
    await expect(page.locator('text=Criar Novo Item')).toBeVisible();
    
    // Error message should appear
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
  });

  test('should reset form and close on cancel', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Novo Item")');
    await expect(page.locator('text=Criar Novo Item')).toBeVisible();
    
    // Fill some data
    await page.fill('input[name="sku"]', 'TEST-123');
    
    // Click cancel
    await page.click('button:has-text("Cancelar")');
    
    // Modal should close
    await expect(page.locator('text=Criar Novo Item')).not.toBeVisible();
  });
});
