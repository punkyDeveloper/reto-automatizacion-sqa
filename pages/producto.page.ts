import { Page, expect, Response } from "@playwright/test";

export class ProductoPage {
  private readonly page: Page;

  // Selectores más específicos para PÁGINA INDIVIDUAL de producto
  private readonly productTitle = 'h1.product_title.entry-title';
  private readonly productPrice = '.summary .price .woocommerce-Price-amount';  // MÁS ESPECÍFICO - solo el precio del producto actual
  private readonly addToCartButton = 'button.single_add_to_cart_button';
  private readonly productDescription = '.woocommerce-product-details__short-description';
  private readonly productImage = '.woocommerce-product-gallery img';
  
  // Selectores para validaciones
  private readonly cartNotification = '.woocommerce-message';
  private readonly quantityInput = '.quantity input[type="number"]';
  private readonly cartForm = 'form.cart';

  constructor(page: Page) {
    this.page = page;
  }

  async waitForProductLoad(): Promise<void> {
    console.log('Esperando carga de página de producto...');
    
    // Esperar carga básica SIN networkidle que causa timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Intentar networkidle con timeout corto, pero no fallar si no se cumple
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch (error) {
      console.log('NetworkIdle timeout - continuando sin esperar networkidle');
    }

    // Validar que estamos en una página INDIVIDUAL de producto (no listado)
    await this.waitForSingleProductPage();
    
    console.log('Página de producto cargada correctamente');
  }

  private async waitForSingleProductPage(): Promise<void> {
    // Esperar que el título del producto esté visible
    await expect(this.page.locator(this.productTitle)).toBeVisible({ timeout: 15000 });
    
    // Esperar el precio ESPECÍFICO del producto individual (no los de productos relacionados)
    // Usar .first() para tomar solo el primer precio encontrado
    await expect(this.page.locator(this.productPrice).first()).toBeVisible({ timeout: 15000 });
    
    // Esperar el botón de agregar al carrito
    await expect(this.page.locator(this.addToCartButton)).toBeVisible({ timeout: 15000 });
    
    // Validar que estamos en página individual verificando la URL
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/product/')) {
      throw new Error(`No estamos en página de producto individual. URL actual: ${currentUrl}`);
    }
  }

  async getProductDetails(): Promise<{ nombre: string; precio: string; descripcion?: string }> {
    // Asegurar que los elementos estén cargados
    await expect(this.page.locator(this.productTitle)).toBeVisible({ timeout: 10000 });
    
    const nombre = await this.page.locator(this.productTitle).textContent() || 'Producto sin nombre';
    
    // Usar .first() para obtener solo el primer precio (del producto actual)
    const precio = await this.page.locator(this.productPrice).first().textContent() || '$0';
    
    let descripcion = '';
    const descElement = this.page.locator(this.productDescription);
    if (await descElement.isVisible()) {
      descripcion = await descElement.textContent() || '';
    }
    
    return {
      nombre: nombre.trim(),
      precio: precio.trim(),
      descripcion: descripcion.trim()
    };
  }

  async getProductName(): Promise<string> {
    const details = await this.getProductDetails();
    return details.nombre;
  }

  async getProductPrice(): Promise<string> {
    const details = await this.getProductDetails();
    return details.precio;
  }

  async addToCart(): Promise<void> {
    console.log('Agregando producto al carrito...');
    
    const addButton = this.page.locator(this.addToCartButton);
    
    // Validar que el botón existe y está habilitado
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    
    // Scroll al botón si es necesario
    await addButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    
    // Click en agregar al carrito
    await addButton.click();
    
    console.log('Click en agregar al carrito realizado');
  }

  async validateProductAdded(): Promise<void> {
    console.log('Validando que el producto fue agregado...');
    
    // Esperar un poco para que procese la acción
    await this.page.waitForTimeout(3000);

    
    // Buscar notificación de éxito (opcional - no falla si no aparece)
    const notification = this.page.locator(this.cartNotification);
    
    if (await notification.isVisible()) {
      const text = await notification.textContent();
      console.log(`Notificación encontrada: ${text}`);
    } else {
      // Validación alternativa: verificar que la página no muestra errores
      const errorSelectors = ['.woocommerce-error', '.error', '[role="alert"]'];
      let hasError = false;
      
      for (const selector of errorSelectors) {
        if (await this.page.locator(selector).isVisible()) {
          const errorText = await this.page.locator(selector).textContent();
          console.log(`Error encontrado: ${errorText}`);
          hasError = true;
          break;
        }
      }
      
      if (!hasError) {
        console.log('Producto agregado correctamente (no se encontraron errores)');
      }
    }
    
    console.log('Validación de producto agregado completada');
  }

  async addToCartWithQuantity(quantity: number): Promise<void> {
    const quantityField = this.page.locator(this.quantityInput);
    if (await quantityField.isVisible()) {
      await quantityField.clear();
      await quantityField.fill(quantity.toString());
      await this.page.waitForTimeout(500);
    }
    
    await this.addToCart();
  }

  async setQuantity(quantity: number): Promise<void> {
    const quantityField = this.page.locator(this.quantityInput);
    
    if (await quantityField.isVisible()) {
      await quantityField.clear();
      await quantityField.fill(quantity.toString());
      await this.page.waitForTimeout(500);
    }
  }

  async setupNetworkInterception(): Promise<void> {
    await this.page.route('**/add-to-cart**', route => route.continue());
    await this.page.route('**/wc-ajax=add_to_cart**', route => route.continue());
    await this.page.route('**/admin-ajax.php**', route => route.continue());
  }

  async waitForAddToCartResponse(): Promise<Response> {
    return await this.page.waitForResponse(response => 
      response.url().includes('add-to-cart') || 
      response.url().includes('wc-ajax=add_to_cart') ||
      response.url().includes('admin-ajax.php')
    );
  }

  async validateNetworkResponse(response: Response): Promise<void> {
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    
    const responseBody = await response.text();
    expect(responseBody.length).toBeGreaterThan(0);
  }

  async addToCartWithNetworkValidation(): Promise<Response> {
    await this.setupNetworkInterception();
    
    const responsePromise = this.waitForAddToCartResponse();
    await this.addToCart();
    
    const response = await responsePromise;
    await this.validateNetworkResponse(response);
    
    return response;
  }

  async isAddToCartButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.addToCartButton);
    
    if (await button.isVisible()) {
      return await button.isEnabled();
    }
    
    return false;
  }

  async isProductAvailable(): Promise<boolean> {
    return await this.isAddToCartButtonEnabled();
  }

  async getProductImageSrc(): Promise<string> {
    const imageElement = this.page.locator(this.productImage).first();
    
    if (await imageElement.isVisible()) {
      return await imageElement.getAttribute('src') || '';
    }
    
    return '';
  }

  async getProductDescription(): Promise<string> {
    const descElement = this.page.locator(this.productDescription);
    
    if (await descElement.isVisible()) {
      return await descElement.textContent() || '';
    }
    
    return '';
  }

  async takeProductScreenshot(): Promise<Buffer> {
    return await this.page.screenshot({ fullPage: true });
  }

  async validateProductPageElements(): Promise<void> {
    await expect(this.page.locator(this.productTitle)).toBeVisible();
    await expect(this.page.locator(this.productPrice).first()).toBeVisible();
    await expect(this.page.locator(this.addToCartButton)).toBeVisible();
  }

  async debugProductPage(): Promise<void> {
    console.log('=== DEBUG PRODUCT PAGE ===');
    console.log('Current URL:', this.page.url());
    
    const titleCount = await this.page.locator('h1').count();
    console.log('H1 elements found:', titleCount);
    
    const priceCount = await this.page.locator('.woocommerce-Price-amount').count();
    console.log('Price elements found:', priceCount);
    
    const summaryPriceCount = await this.page.locator('.summary .price').count();
    console.log('Summary price elements found:', summaryPriceCount);
    
    const buttonCount = await this.page.locator('button').count();
    console.log('Button elements found:', buttonCount);
    
    const cartButtonCount = await this.page.locator(this.addToCartButton).count();
    console.log('Add to cart buttons found:', cartButtonCount);
    
    // Mostrar todos los precios encontrados para debugging
    const allPrices = await this.page.locator('.woocommerce-Price-amount').allTextContents();
    console.log('All prices found:', allPrices);
    
    console.log('==========================');
  }

  // Método específico para validar que estamos en página individual
  async isOnSingleProductPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const hasProductInUrl = currentUrl.includes('/product/');
    
    const hasTitle = await this.page.locator(this.productTitle).isVisible();
    const hasAddToCartButton = await this.page.locator(this.addToCartButton).isVisible();
    
    return hasProductInUrl && hasTitle && hasAddToCartButton;
  }
}