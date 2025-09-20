import { Page, expect } from "@playwright/test";

export class CategoriaPage {
  private readonly page: Page;

  // Selectores optimizados basados en el HTML real del sitio
  private readonly categoryTitle = 'h1.page-title, h1.woocommerce-products-header__title, h1';
  private readonly productsGrid = '.products, ul.products, .woocommerce-products-wrapper';
  private readonly productItems = '.product, li.product, .type-product, .grid.product.type-product';
  private readonly productName = 'h2.woocommerce-loop-product__title, h3.name a, .product-title, a[href*="/product/"]';
  private readonly productPrice = '.price .woocommerce-Price-amount, .woocommerce-Price-amount, .price bdi';
  private readonly productLink = '.woocommerce-loop-product__link, .product-image a, a[href*="/product/"]';
  
  // Selectores del sidebar (basados en el HTML proporcionado)
  private readonly sidebarCategories = '#menu-category-menu .menu-item a';
  private readonly amorCategoryLink = 'a[href*="/product-category/amor/"]';
  private readonly cumpleanosCategoryLink = 'a[href*="/product-category/cumpleanos/"]';
  
  // Elementos adicionales
  private readonly pagination = '.woocommerce-pagination, .tbay-pagination';
  private readonly resultCount = '.woocommerce-result-count';
  private readonly orderingSelect = '.woocommerce-ordering select[name="orderby"]';

  constructor(page: Page) {
    this.page = page;
  }

  async waitForCategoryLoad(): Promise<void> {
    console.log('Esperando carga de página de categoría...');
    
    await this.page.waitForLoadState('domcontentloaded');
    
    // Espera a que aparezca el grid de productos o mensaje de vacío
    await Promise.race([
      this.page.waitForSelector(this.productsGrid, { timeout: 15000 }),
      this.page.waitForSelector('.woocommerce-info', { timeout: 15000 }) 
    ]);
    
    // Espera breve para elementos AJAX
    await this.page.waitForTimeout(2000);
    
    console.log('Página de categoría cargada');
  }

  async validarTituloCategoria(expectedTitle: string): Promise<void> {
    console.log(`Validando título de categoría: ${expectedTitle}`);
    
    // Esperar a que aparezca algún título
    await this.page.waitForSelector(this.categoryTitle, { timeout: 10000 });
    
    const titleElement = this.page.locator(this.categoryTitle).first();
    await expect(titleElement).toBeVisible();
    
    const titleText = await titleElement.textContent();
    
    if (titleText) {
      const normalizedTitle = titleText.toLowerCase().trim();
      const normalizedExpected = expectedTitle.toLowerCase().trim();
      
      // Validación flexible - el título puede contener texto adicional
      const titleMatches = normalizedTitle.includes(normalizedExpected) || 
                          normalizedExpected.includes(normalizedTitle);
      
      if (titleMatches) {
        console.log(`✓ Título validado: "${titleText}"`);
        return;
      }
    }
    
    // Fallback: validar por URL si el título no coincide exactamente
    const currentUrl = this.page.url().toLowerCase();
    const expectedUrlPart = expectedTitle.toLowerCase()
      .replace('ñ', 'n')
      .replace(/\s+/g, '')
      .replace(/[áéíóú]/g, (match) => {
        const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
        return accents[match as keyof typeof accents] || match;
      });
    
    expect(currentUrl).toContain(expectedUrlPart);
    console.log(`✓ Categoría validada por URL: ${currentUrl}`);
  }

  async validarProductosDisponibles(): Promise<void> {
    console.log('Validando productos disponibles...');
    
    // Esperar a que cargue el contenedor de productos
    await this.page.waitForSelector(this.productsGrid, { timeout: 10000 });
    
    const productsContainer = this.page.locator(this.productsGrid).first();
    await expect(productsContainer).toBeVisible();
    
    // Contar productos
    const products = this.page.locator(this.productItems);
    const productCount = await products.count();
    
    expect(productCount).toBeGreaterThan(0);
    
    // Validar que al menos el primer producto tiene estructura correcta
    const firstProduct = products.first();
    
    // Verificar que tiene nombre
    const hasName = await this.hasProductName(firstProduct);
    // Verificar que tiene precio
    const hasPrice = await this.hasProductPrice(firstProduct);
    
    expect(hasName).toBe(true);
    expect(hasPrice).toBe(true);
    
    console.log(`✓ ${productCount} productos encontrados y validados`);
  }

  private async hasProductName(product: any): Promise<boolean> {
    const nameSelectors = this.productName.split(', ');
    for (const selector of nameSelectors) {
      const nameElement = product.locator(selector).first();
      if (await nameElement.isVisible()) {
        const text = await nameElement.textContent();
        if (text && text.trim()) {
          return true;
        }
      }
    }
    return false;
  }

  private async hasProductPrice(product: any): Promise<boolean> {
    const priceSelectors = this.productPrice.split(', ');
    for (const selector of priceSelectors) {
      const priceElement = product.locator(selector).first();
      if (await priceElement.isVisible()) {
        const text = await priceElement.textContent();
        if (text && text.trim() && text.includes('$')) {
          return true;
        }
      }
    }
    return false;
  }

  async selectTwoDistinctProducts(): Promise<{ producto1: { nombre: string; precio: string }; producto2: { nombre: string; precio: string } }> {
    console.log('Seleccionando dos productos distintos...');
    
    const products = this.page.locator(this.productItems);
    const productCount = await products.count();
    
    expect(productCount).toBeGreaterThanOrEqual(2);
    
    const producto1 = await this.getProductInfo(products, 0);
    const producto2 = await this.getProductInfo(products, 1);
    
    // Validar que son diferentes
    expect(producto1.nombre).not.toBe(producto2.nombre);
    
    console.log(`✓ Producto 1: ${producto1.nombre} - ${producto1.precio}`);
    console.log(`✓ Producto 2: ${producto2.nombre} - ${producto2.precio}`);
    
    return { producto1, producto2 };
  }

  async selectSingleProduct(index: number = 0): Promise<{ nombre: string; precio: string }> {
    console.log(`Seleccionando producto en índice ${index}...`);
    
    const products = this.page.locator(this.productItems);
    const productCount = await products.count();
    
    expect(productCount).toBeGreaterThan(index);
    
    const producto = await this.getProductInfo(products, index);
    console.log(`✓ Producto seleccionado: ${producto.nombre} - ${producto.precio}`);
    
    return producto;
  }

  private async getProductInfo(products: any, index: number): Promise<{ nombre: string; precio: string }> {
    const product = products.nth(index);
    
    // Obtener nombre
    let nombre = `Producto ${index + 1}`;
    const nameSelectors = this.productName.split(', ');
    
    for (const selector of nameSelectors) {
      const nameElement = product.locator(selector).first();
      if (await nameElement.isVisible()) {
        const nameText = await nameElement.textContent();
        if (nameText && nameText.trim()) {
          nombre = nameText.trim();
          break;
        }
      }
    }
    
    // Obtener precio
    let precio = '$0';
    const priceSelectors = this.productPrice.split(', ');
    
    for (const selector of priceSelectors) {
      const priceElement = product.locator(selector).first();
      if (await priceElement.isVisible()) {
        const priceText = await priceElement.textContent();
        if (priceText && priceText.trim() && priceText.includes('$')) {
          precio = priceText.trim();
          break;
        }
      }
    }
    
    return { nombre, precio };
  }

  async clickProductByIndex(index: number): Promise<void> {
    console.log(`Haciendo click en producto índice ${index}...`);
    
    const products = this.page.locator(this.productItems);
    const productCount = await products.count();
    
    expect(productCount).toBeGreaterThan(index);
    
    const product = products.nth(index);
    
    // Hacer scroll al producto y esperar a que sea visible
    await product.scrollIntoViewIfNeeded();
    await expect(product).toBeVisible();
    
    // Intentar click en diferentes elementos del producto
    const clickSelectors = [
      '.woocommerce-loop-product__link',
      '.product-image a',
      'a[href*="/product/"]',
      'h2.woocommerce-loop-product__title a',
      '.product-image'
    ];
    
    let clicked = false;
    
    for (const selector of clickSelectors) {
      const clickElement = product.locator(selector).first();
      
      if (await clickElement.isVisible()) {
        try {
          await clickElement.click();
          clicked = true;
          console.log(`✓ Click realizado con selector: ${selector}`);
          break;
        } catch (error) {
          console.log(`Intento fallido con ${selector}:`, error);
          continue;
        }
      }
    }
    
    if (!clicked) {
      // Fallback: click directo en el producto
      await product.click();
      console.log('✓ Click realizado directamente en el producto');
    }
    
    // Esperar navegación a la página del producto
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async getProductCount(): Promise<number> {
    const products = this.page.locator(this.productItems);
    return await products.count();
  }

  async getResultCountText(): Promise<string> {
    const resultElement = this.page.locator(this.resultCount).first();
    
    if (await resultElement.isVisible()) {
      return await resultElement.textContent() || '';
    }
    
    return '';
  }

  async getAllProductsInfo(): Promise<Array<{ nombre: string; precio: string; imagen: string }>> {
    const products = this.page.locator(this.productItems);
    const productCount = await products.count();
    const productsInfo: Array<{ nombre: string; precio: string; imagen: string }> = [];
    
    for (let i = 0; i < productCount; i++) {
      const productInfo = await this.getProductInfo(products, i);
      
      // Obtener imagen
      const product = products.nth(i);
      let imagen = '';
      
      const imgElement = product.locator('img').first();
      if (await imgElement.isVisible()) {
        imagen = await imgElement.getAttribute('src') || '';
      }
      
      productsInfo.push({
        nombre: productInfo.nombre,
        precio: productInfo.precio,
        imagen
      });
    }
    
    return productsInfo;
  }

  async orderBy(criteria: string): Promise<void> {
    const orderingSelect = this.page.locator(this.orderingSelect);
    
    if (await orderingSelect.isVisible()) {
      await orderingSelect.selectOption(criteria);
      await this.page.waitForTimeout(2000);
      await this.waitForCategoryLoad();
    }
  }

  async hasPagination(): Promise<boolean> {
    const paginationElement = this.page.locator(this.pagination).first();
    return await paginationElement.isVisible();
  }

  async getCurrentPage(): Promise<string> {
    const currentPageElement = this.page.locator('.page-numbers.current').first();
    
    if (await currentPageElement.isVisible()) {
      return await currentPageElement.textContent() || '1';
    }
    
    return '1';
  }

  async tomarScreenshotCategoria(): Promise<Buffer> {
    return await this.page.screenshot({ 
      fullPage: true,
      animations: 'disabled'
    });
  }

  async isFullyLoaded(): Promise<boolean> {
    try {
      // Verificar elementos críticos
      const hasTitle = await this.page.locator(this.categoryTitle).first().isVisible();
      const hasProductsOrEmpty = await Promise.race([
        this.page.locator(this.productsGrid).first().isVisible(),
        this.page.locator('.woocommerce-info').first().isVisible()
      ]);
      
      return hasTitle && hasProductsOrEmpty;
    } catch (error) {
      return false;
    }
  }

  async waitUntilFullyLoaded(timeout: number = 20000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isFullyLoaded()) {
        console.log('✓ Página de categoría completamente cargada');
        return;
      }
      await this.page.waitForTimeout(500);
    }
    
    throw new Error(`Timeout: La página de categoría no se cargó en ${timeout}ms`);
  }

  // Método de debug simplificado
  async debugCategoryPage(): Promise<void> {
    console.log('=== DEBUG CATEGORY PAGE ===');
    console.log('URL actual:', this.page.url());
    
    const titleCount = await this.page.locator('h1').count();
    console.log('Títulos H1:', titleCount);
    
    if (titleCount > 0) {
      const titles = await this.page.locator('h1').allTextContents();
      console.log('Contenido títulos:', titles);
    }
    
    const productCount = await this.getProductCount();
    console.log('Productos encontrados:', productCount);
    
    const hasProducts = await this.page.locator(this.productsGrid).first().isVisible();
    console.log('Grid de productos visible:', hasProducts);
    

  }
}