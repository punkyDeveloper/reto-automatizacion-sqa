import { Page, expect } from "@playwright/test";

export class CarritoPage {
  private readonly page: Page;

// Selectores actualizados basados en el HTML real del carrito
  private readonly cartTable = '.shop_table.cart.woocommerce-cart-form__contents';
  private readonly cartItems = 'tr.cart_item';
  private readonly productName = '.product-name a';
  // Fix: El precio individual está en .product-price, no .product-price .woocommerce-Price-amount
  private readonly productPrice = '.product-price .woocommerce-Price-amount';
  private readonly productQuantity = '.product-quantity input.input-text.qty.text';
  private readonly removeButton = '.product-remove a.remove';
  // Fix: Selectores más específicos para subtotal y total
  private readonly subtotalElement = '.cart-subtotal .woocommerce-Price-amount';
  private readonly totalElement = '.order-total .woocommerce-Price-amount';
  private readonly emptyCartMessage = '.woocommerce-info, .cart-empty';
  private readonly updateCartButton = '[name="update_cart"]';
  private readonly cartIcon = '.mini-cart';
  private readonly cartCounter = '.mini-cart-items, .cart-contents-count';
  private readonly checkoutButton = '.checkout-button';
  private readonly successMessage = '.woocommerce-message';

  constructor(page: Page) {
    this.page = page;
  }

async irAlCarrito(): Promise<void> {
    console.log('Navegando al carrito...');
    
    // Estrategia 1: Intentar click en icono del carrito
    const cartIcon = this.page.locator(this.cartIcon).first();
    if (await cartIcon.isVisible({ timeout: 5000 })) {
      try {
        await cartIcon.click();
        await this.waitForCartLoad();
        console.log('✓ Navegación via icono del carrito');
        return;
      } catch (error) {
        console.log('Click en icono falló, intentando navegación directa...');
      }
    }
    
    // Estrategia 2: Navegación directa - probar ambas rutas
    const possibleRoutes = ['/cart/', '/carrito/'];
    
    for (const route of possibleRoutes) {
      try {
        await this.page.goto(route, { timeout: 15000 });
        await this.waitForCartLoad();
        console.log(`✓ Navegación directa exitosa usando: ${route}`);
        return;
      } catch (error) {
        console.log(`Ruta ${route} falló, probando siguiente...`);
        continue;
      }
    }
    
    throw new Error('No se pudo navegar al carrito usando ninguna estrategia');
  }

  async waitForCartLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    
    // Esperar que cargue la tabla del carrito O el mensaje de carrito vacío
    const cartTable = this.page.locator(this.cartTable);
    const emptyMessage = this.page.locator(this.emptyCartMessage);
    
    await expect(cartTable.or(emptyMessage)).toBeVisible();
  }

  async getCartItemCount(): Promise<number> {
    await this.waitForCartLoad();
    
    if (await this.isCartEmpty()) {
      return 0;
    }
    
    return await this.page.locator(this.cartItems).count();
  }

  async validateCartItem(expectedName: string, expectedPrice: string): Promise<void> {
    // Buscar el producto por nombre en el carrito (búsqueda parcial más flexible)
    const productRow = this.page.locator(this.cartItems).filter({
      has: this.page.locator(this.productName).filter({ hasText: new RegExp(expectedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    });
    
    await expect(productRow).toBeVisible();
    
    // Validar el precio
    const priceElement = productRow.locator(this.productPrice);
    await expect(priceElement).toBeVisible();
    
    const actualPrice = await priceElement.textContent();
    const cleanActualPrice = this.cleanPriceString(actualPrice || '');
    const cleanExpectedPrice = this.cleanPriceString(expectedPrice);
    
    expect(cleanActualPrice).toBe(cleanExpectedPrice);
  }

  async getSubtotal(): Promise<string> {
    const subtotalElement = this.page.locator(this.subtotalElement);
    await expect(subtotalElement).toBeVisible();
    return await subtotalElement.textContent() || '0';
  }

  async getTotal(): Promise<string> {
    const totalElement = this.page.locator(this.totalElement);
    await expect(totalElement).toBeVisible();
    return await totalElement.textContent() || '0';
  }

  async calcularSubtotalEsperado(precios: string[]): Promise<string> {
    let total = 0;
    
    for (const precio of precios) {
      // Limpiar el precio y extraer solo los números
      const cleanPrice = this.cleanPriceString(precio);
      const numericPrice = parseInt(cleanPrice);
      
      if (!isNaN(numericPrice)) {
        total += numericPrice;
      }
    }
    
    return total.toString();
  }

  private cleanPriceString(price: string): string {
    // Remover todo excepto números - basado en el HTML: $&nbsp;129.000
    return price.replace(/[^\d]/g, '');
  }

  async removeProduct(productName: string): Promise<void> {
    // Buscar el producto por nombre (búsqueda más flexible)
    const productRow = this.page.locator(this.cartItems).filter({
      has: this.page.locator(this.productName).filter({ hasText: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    });
    
    await expect(productRow).toBeVisible();
    
    // Hacer click en el botón de eliminar
    const removeBtn = productRow.locator(this.removeButton);
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    
    // Esperar que la página se actualice después de eliminar
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
  }

  async isCartEmpty(): Promise<boolean> {
    // Verificar si existe mensaje de carrito vacío
    const emptyMessage = this.page.locator(this.emptyCartMessage);
    if (await emptyMessage.isVisible()) {
      return true;
    }
    
    // Verificar si no hay items en la tabla
    const itemCount = await this.page.locator(this.cartItems).count();
    return itemCount === 0;
  }

  async getEmptyCartMessage(): Promise<string> {
    const emptyMessage = this.page.locator(this.emptyCartMessage);
    if (await emptyMessage.isVisible()) {
      return await emptyMessage.textContent() || '';
    }
    return '';
  }

  async validarCarritoVacio(): Promise<void> {
    // Validar que el carrito está vacío
    const isEmpty = await this.isCartEmpty();
    expect(isEmpty).toBe(true);
    
    // Si hay mensaje de carrito vacío, validarlo
    if (await this.page.locator(this.emptyCartMessage).isVisible()) {
      const emptyMessage = await this.getEmptyCartMessage();
      expect(emptyMessage.toLowerCase()).toMatch(/carrito|vac[íi]o|empty/);
    }
  }

  async validarCarritoNoVacio(): Promise<void> {
    // Validar que hay items en el carrito
    const itemCount = await this.getCartItemCount();
    expect(itemCount).toBeGreaterThan(0);
    
    // Validar que la tabla del carrito es visible
    await expect(this.page.locator(this.cartTable)).toBeVisible();
    
    // Validar que hay subtotal mayor a 0
    const subtotal = await this.getSubtotal();
    const cleanSubtotal = this.cleanPriceString(subtotal);
    expect(parseInt(cleanSubtotal)).toBeGreaterThan(0);
  }

  async validarSuccessMessage(productName?: string): Promise<void> {
    const message = this.page.locator(this.successMessage);
    await expect(message).toBeVisible();
    
    if (productName) {
      await expect(message).toContainText(productName);
    }
    
    await expect(message).toContainText(/añadido|agregado|added/i);
  }

  async updateCartQuantity(productName: string, newQuantity: number): Promise<void> {
    // Buscar el producto por nombre
    const productRow = this.page.locator(this.cartItems).filter({
      has: this.page.locator(this.productName).filter({ hasText: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
    });
    
    // Cambiar la cantidad
    const quantityInput = productRow.locator(this.productQuantity);
    await quantityInput.fill(newQuantity.toString());
    
    // Actualizar carrito
    const updateButton = this.page.locator(this.updateCartButton);
    if (await updateButton.isVisible() && await updateButton.isEnabled()) {
      await updateButton.click();
      await this.waitForCartLoad();
    }
  }

  async getAllCartItems(): Promise<Array<{name: string, price: string, quantity: string}>> {
    const items: Array<{name: string, price: string, quantity: string}> = [];
    const cartRows = this.page.locator(this.cartItems);
    const count = await cartRows.count();
    
    for (let i = 0; i < count; i++) {
      const row = cartRows.nth(i);
      
      const nameElement = row.locator(this.productName);
      const priceElement = row.locator(this.productPrice);
      const quantityElement = row.locator(this.productQuantity);
      
      const nameText = await nameElement.textContent();
      const priceText = await priceElement.textContent();
      const quantityValue = await quantityElement.inputValue();
      
      const name = nameText ? nameText.trim() : '';
      const price = priceText ? priceText.trim() : '';
      const quantity = quantityValue || '1';
      
      items.push({ name, price, quantity });
    }
    
    return items;
  }

  async proceedToCheckout(): Promise<void> {
    const checkoutButton = this.page.locator(this.checkoutButton);
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();
  }

  // Métodos de screenshots para el test de cumpleaños
  async takeScreenshotBeforeAction(): Promise<Buffer> {
    return await this.page.screenshot({ fullPage: true });
  }

  async takeScreenshotAfterAction(): Promise<Buffer> {
    return await this.page.screenshot({ fullPage: true });
  }

  async attachScreenshots(testInfo: any): Promise<void> {
    // Adjuntar screenshots al reporte de Playwright
    const screenshot = await this.page.screenshot({ fullPage: true });
    await testInfo.attach('carrito-estado-actual', { 
      body: screenshot, 
      contentType: 'image/png' 
    });
  }

  // Método helper para debugging
  async logCartState(): Promise<void> {
    const itemCount = await this.getCartItemCount();
    const isEmpty = await this.isCartEmpty();
    
    console.log(`Estado del carrito:`);
    console.log(`- Items: ${itemCount}`);
    console.log(`- Está vacío: ${isEmpty}`);
    
    if (!isEmpty) {
      const subtotal = await this.getSubtotal();
      const total = await this.getTotal();
      console.log(`- Subtotal: ${subtotal}`);
      console.log(`- Total: ${total}`);
    }
  }
}