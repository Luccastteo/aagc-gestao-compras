import { test, expect } from '@playwright/test';

test.describe('Auth - Login', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('#login-email', 'manager@demo.com');
    await page.fill('#login-password', 'demo123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation (login processes)
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    
    // Verify dashboard content
    await expect(page.locator('text=Dashboard').or(page.locator('h1')).first()).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('#login-email', 'invalid@test.com');
    await page.fill('#login-password', 'wrongpassword');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/);
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
  });

  test('should require email and password', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Form validation should prevent submission
    // (HTML5 validation will block the submit)
    await expect(page).toHaveURL(/.*login.*/);
  });
});
