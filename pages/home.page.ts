import { Page, expect } from "@playwright/test";

export class HomePage {
  private readonly page: Page;

  // Selectores más específicos basados en el HTML real
  private readonly menuNavigation = 'ul#primary-menu';
  // Usar selectores específicos 
  private readonly amorLinkDesktop = '#primary-menu a[href="https://www.floristeriamundoflor.com/product-category/amor/"]';
  private readonly cumpleanosLinkDesktop = '#primary-menu a[href="https://www.floristeriamundoflor.com/product-category/cumpleanos/"]';

  private readonly amorLinkGeneric = 'a[href="https://www.floristeriamundoflor.com/product-category/amor/"]';
  private readonly cumpleanosLinkGeneric = 'a[href="https://www.floristeriamundoflor.com/product-category/cumpleanos/"]';
  private readonly cartIcon = '.mini-cart';
  private readonly cartItemCount = '.mini-cart-items';
  private readonly logo = '.logo img, .site-logo img, .custom-logo';

  constructor(page: Page) {
    this.page = page;
  }

  async abrir() {
    await this.page.goto("/");
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    console.log('Esperando carga inicial de la página (10 segundos)...');
    

    await this.page.waitForTimeout(10000);
    
    // Esperar que la página termine de cargar
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Validar que el menú principal esté visible
    await expect(this.page.locator(this.menuNavigation)).toBeVisible({ timeout: 15000 });
    
    console.log('Página cargada completamente');
  }

  async navegarAArmor(): Promise<void> {
    console.log('Navegando a la categoría Amor...');
    
    // Estrategia 1: Intentar link específico del desktop menu
    const amorLinkDesktop = this.page.locator(this.amorLinkDesktop);
    
    if (await amorLinkDesktop.isVisible()) {
      console.log('Usando enlace desktop específico');
      await expect(amorLinkDesktop).toBeVisible({ timeout: 10000 });
      await expect(amorLinkDesktop).toBeEnabled({ timeout: 5000 });
      await amorLinkDesktop.click();
    } else {

      console.log('Usando enlace genérico (.first())');
      const amorLinkGeneric = this.page.locator(this.amorLinkGeneric).first();
      await expect(amorLinkGeneric).toBeVisible({ timeout: 10000 });
      await expect(amorLinkGeneric).toBeEnabled({ timeout: 5000 });
      await amorLinkGeneric.click();
    }
    
    console.log('Click realizado, esperando carga de página...');
    
    // Esperar navegación
    await this.page.waitForTimeout(3000);
    
    await Promise.race([
      this.page.waitForURL('**/product-category/amor/**', { timeout: 15000 }),
      this.page.waitForURL('**/amor/**', { timeout: 15000 })
    ]);
    
    await this.page.waitForLoadState('domcontentloaded');

    
    // Verificar URL
    const currentURL = this.page.url();
    expect(currentURL).toContain('amor');
    
    console.log('✓ Navegación a Amor completada');
  }

  async navegarACumpleanos(): Promise<void> {
    console.log('Navegando a la categoría Cumpleaños...');
    

    const cumpleanosLinkDesktop = this.page.locator(this.cumpleanosLinkDesktop);
    
    if (await cumpleanosLinkDesktop.isVisible()) {
      console.log('Usando enlace desktop específico');
      await expect(cumpleanosLinkDesktop).toBeVisible({ timeout: 10000 });
      await expect(cumpleanosLinkDesktop).toBeEnabled({ timeout: 5000 });
      await cumpleanosLinkDesktop.click();
    } else {

      console.log('Usando enlace genérico (.first())');
      const cumpleanosLinkGeneric = this.page.locator(this.cumpleanosLinkGeneric).first();
      await expect(cumpleanosLinkGeneric).toBeVisible({ timeout: 10000 });
      await expect(cumpleanosLinkGeneric).toBeEnabled({ timeout: 5000 });
      await cumpleanosLinkGeneric.click();
    }
    
    console.log('Click realizado, esperando carga de página...');
    

    await this.page.waitForTimeout(3000);
    
    await Promise.race([
      this.page.waitForURL('**/product-category/cumpleanos/**', { timeout: 15000 }),
      this.page.waitForURL('**/cumpleanos/**', { timeout: 15000 })
    ]);
    
    await this.page.waitForLoadState('domcontentloaded');
    
    // Verificar URL
    const currentURL = this.page.url();
    expect(currentURL).toContain('cumple');
    
    console.log('✓ Navegación a Cumpleaños completada');
  }

  
  async validarExistenciaYVisibilidadAmor(): Promise<void> {
    
    const amorElement = this.page.locator(this.amorLinkGeneric).first();
    
    await expect(amorElement).toBeVisible({ timeout: 15000 });
    await expect(amorElement).toHaveText('Amor');
    await expect(amorElement).toHaveAttribute('href', 'https://www.floristeriamundoflor.com/product-category/amor/');
  }

  async validarExistenciaYVisibilidadCumpleanos(): Promise<void> {
    
    const cumpleanosElement = this.page.locator(this.cumpleanosLinkGeneric).first();
    
    await expect(cumpleanosElement).toBeVisible({ timeout: 15000 });
    await expect(cumpleanosElement).toHaveText('Cumpleaños');
    await expect(cumpleanosElement).toHaveAttribute('href', 'https://www.floristeriamundoflor.com/product-category/cumpleanos/');
  }

  async validarMenuCompleto(): Promise<void> {

    const menuItems = [
      'Arreglo Florales',
      'Amor', 
      'Cumpleaños',
      'Condolencias',
      'Desayunos Sorpresa',
      'Ramilletes y Cajas',
      'Contacto'
    ];

    for (const item of menuItems) {
      const menuLink = this.page.locator(`${this.menuNavigation} a:has-text("${item}")`);
      await expect(menuLink).toBeVisible({ timeout: 5000 });
    }
  }

  // GETTERS ÚTILES
  async getMenuItems(): Promise<string[]> {
    const menuLinks = this.page.locator(`${this.menuNavigation} a`);
    await expect(menuLinks.first()).toBeVisible();
    return await menuLinks.allTextContents();
  }

  async isMenuVisible(): Promise<boolean> {
    return await this.page.locator(this.menuNavigation).isVisible();
  }

  async tomarScreenshotHomePage(): Promise<Buffer> {
    return await this.page.screenshot({ 
      fullPage: true,
      animations: 'disabled' 
    });
  }

  async validarCarritoVacio(): Promise<void> {
    const cartCounter = this.page.locator(this.cartItemCount);
    if (await cartCounter.isVisible()) {
      await expect(cartCounter).toHaveText('0');
    }
  }

  // NAVEGACIÓN GENÉRICA MEJORADA
  async navegarACategoria(categoria: string): Promise<void> {
    if (categoria === 'Amor') {
      await this.navegarAArmor();
    } else if (categoria === 'Cumpleaños') {
      await this.navegarACumpleanos();
    } else {
      // Para otras categorías - usar selector específico del primary menu
      const categoriaLink = this.page.locator(`${this.menuNavigation} a:has-text("${categoria}")`);
      await expect(categoriaLink).toBeVisible({ timeout: 10000 });
      await categoriaLink.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000);
    }
  }

  // MÉTODO ALTERNATIVO: Navegación directa por URL (más confiable)
  async navegarAAmorDirecto(): Promise<void> {
    console.log('Navegación directa a categoría Amor...');
    await this.page.goto('/product-category/amor/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✓ Navegación directa a Amor completada');
  }

  async navegarACumpleanosDirecto(): Promise<void> {
    console.log('Navegación directa a categoría Cumpleaños...');
    await this.page.goto('/product-category/cumpleanos/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✓ Navegación directa a Cumpleaños completada');
  }

  // MÉTODO PARA DEBUGGING
  async debugPageState(): Promise<void> {
    console.log('=== DEBUG PAGE STATE ===');
    console.log('Current URL:', this.page.url());
    console.log('Menu visible:', await this.isMenuVisible());
    
    // Contar cuántos enlaces de Amor hay
    const amorLinksCount = await this.page.locator(this.amorLinkGeneric).count();
    console.log('Amor links found:', amorLinksCount);
    
    // Contar cuántos enlaces de Cumpleaños hay
    const cumpleanosLinksCount = await this.page.locator(this.cumpleanosLinkGeneric).count();
    console.log('Cumpleaños links found:', cumpleanosLinksCount);
    
    // Mostrar cuáles están visibles
    for (let i = 0; i < amorLinksCount; i++) {
      const link = this.page.locator(this.amorLinkGeneric).nth(i);
      const visible = await link.isVisible();
      console.log(`Amor link ${i}: visible = ${visible}`);
    }
    
    const menuItems = await this.getMenuItems();
    console.log('Menu items:', menuItems);
    console.log('========================');
  }

  // MÉTODO PARA ESPERAR ELEMENTOS CRÍTICOS
  async waitForCriticalElements(): Promise<void> {
    await expect(this.page.locator(this.menuNavigation)).toBeVisible({ timeout: 15000 });

    await expect(this.page.locator(this.amorLinkGeneric).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator(this.cumpleanosLinkGeneric).first()).toBeVisible({ timeout: 10000 });
  }
}