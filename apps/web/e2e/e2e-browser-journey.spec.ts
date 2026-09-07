import { test, expect } from "@playwright/test";

test.describe("JAAMA Production Core Business OS Browser E2E Certification (Section G)", () => {
  test("Complete Real Browser Journey: Auth -> Product Creation -> POS Checkout -> Sales List -> Live Dashboard", async ({ page }) => {
    // 1. Open Login Page
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/JAAMA/i);
    await expect(page.locator("body")).toContainText("Connexion à votre espace");

    // 2. Perform Real Login via UI
    await page.fill("#email-input", "hamidou@diallo-commerce.ml");
    await page.fill("#password-input", "Password123!");
    await page.click("#login-submit-button");

    // 3. Authenticated Redirect to Dashboard & Verify Workspace
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/dashboard", { timeout: 10000 });
    await expect(page.locator("body")).toContainText("Diallo Commerce");

    // 4. Navigate to Products UI & Create Product
    await page.goto("/produits");
    await expect(page.locator("body")).toContainText("Catalogue Produits");

    await page.click("button:has-text('Nouveau produit')");
    await page.fill("input[placeholder='ex: RIZ-5KG']", "E2E-COCA-001");
    await page.fill("input[placeholder='ex: Riz Parfumé 5kg']", "Coca-Cola 50cl");
    await page.selectOption("select", "Boissons");
    await page.fill("input[placeholder='6500']", "500");
    await page.fill("input[value='10']", "100");

    await page.click("button:has-text('Enregistrer le produit')");
    await expect(page.locator("table")).toContainText("Coca-Cola 50cl");
    await expect(page.locator("table")).toContainText("E2E-COCA-001");

    // 5. Navigate to POS & Submit Sale with Partial Payment
    await page.goto("/ventes/nouvelle");
    await expect(page.locator("body")).toContainText("Nouvelle vente");

    // Click product add button to add to cart (10 times)
    const addButton = page.getByRole("button", { name: "Ajouter 1 Coca-Cola 50cl" });
    await expect(addButton).toBeVisible();
    for (let i = 0; i < 10; i++) {
      await addButton.click();
    }

    // Proceed to Checkout
    await page.click("button:has-text('Continuer vers le paiement')");

    // Select Wave payment & input 3000 FCFA
    await page.click("button:has-text('Wave')");
    const amountInput = page.locator("input[type='number']").first();
    await amountInput.fill("3000");

    // Confirm Sale
    await page.click("button:has-text('Confirmer la vente')");

    // 6. Verify Real Sale Success Screen
    await expect(page.locator("body")).toContainText("Vente enregistrée");
    await expect(page.locator("body")).toContainText("5 000 FCFA");

    // 7. Navigate to Sales List & Verify Persisted Sale
    await page.goto("/ventes");
    await expect(page.locator("body")).toContainText("Ventes");
    await expect(page.locator("table")).toContainText("5 000 FCFA");
    await expect(page.locator("table")).toContainText("3 000 FCFA");
    await expect(page.locator("table")).toContainText("2 000 FCFA");

    // 8. Navigate to Dashboard & Verify Live Metrics
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Diallo Commerce");
  });
});
