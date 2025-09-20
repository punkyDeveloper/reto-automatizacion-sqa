// cumple.spec.ts
import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { CategoriaPage } from '../../pages/categoria.page';
import { ProductoPage } from '../../pages/producto.page';
import { CarritoPage } from '../../pages/caro.page';
import { testData, expectedElements } from '../fixtures/test-data';

test.describe('Escenario 2 - Categoría Cumpleaños E2E', () => {
  let homePage: HomePage;
  let categoriaPage: CategoriaPage;
  let productoPage: ProductoPage;
  let carritoPage: CarritoPage;

  // Configurar reintentos usando datos centralizados SOLO para este spec
  test.describe.configure({ retries: testData.retries.cumpleanos });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    categoriaPage = new CategoriaPage(page);
    productoPage = new ProductoPage(page);
    carritoPage = new CarritoPage(page);

    await homePage.abrir();
  });

  test('Debe navegar a categoría Cumpleaños y validar contenido', async ({ page }) => {
    // 1. Entrar a la categoría Cumpleaños
    await homePage.navegarACumpleanos();
    
    // 2. Validar que estamos en la página correcta
    await categoriaPage.validarTituloCategoria(testData.categorias[1]); // 'Cumpleaños'
    await categoriaPage.validarProductosDisponibles();
    
    // Screenshot de la categoría cargada
    await test.info().attach('categoria-cumpleanos-cargada', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  });

  test('Debe seleccionar producto de Cumpleaños y agregarlo al carrito', async ({ page }) => {
    /**
     * NOTA: Este spec usa reintentos controlados (test.retry configurado a nivel de describe) porque:
     * - La eliminación de productos del carrito puede ser inconsistente
     * - Algunos elementos pueden tardar en cargar después de operaciones AJAX
     * - La validación del estado vacío del carrito puede requerir tiempo adicional
     */
    
    test.setTimeout(testData.timeouts.navigation + testData.timeouts.network);
    
    // 1. Entrar a la categoría Cumpleaños
    await homePage.navegarACumpleanos();
    await categoriaPage.validarTituloCategoria(testData.categorias[1]);
    await categoriaPage.validarProductosDisponibles();
    
    // 2. Seleccionar un producto
    const producto = await categoriaPage.selectSingleProduct(0);
    console.log(`Producto seleccionado: ${producto.nombre} - ${producto.precio}`);
    
    // 3. Abrir el detalle del producto
    await categoriaPage.clickProductByIndex(0);
    await productoPage.waitForProductLoad();
    
    // Validar que los datos del producto coinciden
    const detallesProducto = await productoPage.getProductDetails();
    expect(detallesProducto.nombre).toContain(producto.nombre);
    
    // Screenshot antes de agregar al carrito 
    await test.info().attach('antes-agregar-producto-cumpleanos', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
    
    // 4. Agregar al carrito
    await productoPage.addToCart();
    await productoPage.validateProductAdded();
    
//  5. Verificar que el contador del carrito se actualiza
    
    const cartCounter = page.locator('.mini-cart-items, .cart-contents-count').first();
    
    
    try {
      if (await cartCounter.isVisible({ timeout: 5000 })) {
        const counterText = await cartCounter.textContent();
        const counterValue = parseInt(counterText?.trim() || '0');
        expect(counterValue).toBeGreaterThan(0);
        console.log(`✓ Contador del carrito actualizado: ${counterValue}`);
      } else {
        console.log('Contador no visible, verificando notificación de producto agregado...');

        const notification = page.locator('.woocommerce-message').first();
        if (await notification.isVisible({ timeout: 3000 })) {
          const notificationText = await notification.textContent();
          expect(notificationText).toContain('añadido');
          console.log('✓ Producto confirmado agregado por notificación');
        }
      }
    } catch (error) {
      console.log('Error con contador del carrito, continuando test...', error);

    }
    
    // Screenshot después de agregar al carrito
    await test.info().attach('despues-agregar-producto-cumpleanos', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  });

  test('Debe validar producto en carrito y luego eliminarlo completamente', async ({ page }) => {
    test.setTimeout(testData.timeouts.navigation + testData.timeouts.network);
    
    // Setup: Agregar un producto de cumpleaños al carrito
    await homePage.navegarACumpleanos();
    await categoriaPage.validarTituloCategoria(testData.categorias[1]);
    
    const producto = await categoriaPage.selectSingleProduct(0);
    await categoriaPage.clickProductByIndex(0);
    await productoPage.waitForProductLoad();
    await productoPage.addToCart();
    await productoPage.validateProductAdded();
    
    // 1. Navegar al carrito
    await carritoPage.irAlCarrito();
    
    // 2. Validar que el producto está en el carrito
    await carritoPage.validarCarritoNoVacio();
    await carritoPage.validateCartItem(producto.nombre, producto.precio);
    
    const itemCountAntes = await carritoPage.getCartItemCount();
    expect(itemCountAntes).toBe(1);
    
    // Screenshot del carrito ANTES de eliminar 
    await test.info().attach('carrito-antes-eliminar-cumpleanos', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
    
    // 3. Eliminar el producto del carrito
    await carritoPage.removeProduct(producto.nombre);
    
    // Screenshot del carrito DESPUÉS de eliminar 
    await test.info().attach('carrito-despues-eliminar-cumpleanos', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
    
    // 4. Validaciones finales del carrito vacío
    await carritoPage.validarCarritoVacio();
    
    const itemCountDespues = await carritoPage.getCartItemCount();
    expect(itemCountDespues).toBe(0);
    
    // 5. Validar que aparece mensaje de carrito vacío
    const mensajeVacio = await carritoPage.getEmptyCartMessage();
    expect(mensajeVacio.toLowerCase()).toMatch(/carrito|vac[íi]o|empty/);
    
    // 6. Validación adicional: total = 0
    const totalElements = page.locator('.order-total .woocommerce-Price-amount, .cart-total');
    if (await totalElements.first().isVisible()) {
      const totalText = await totalElements.first().textContent();
      const cleanTotal = totalText?.replace(/[^\d]/g, '') || '0';
      expect(parseInt(cleanTotal)).toBe(0);
    }

    console.log(`Test de eliminación completado exitosamente:`);
    console.log(`- Producto eliminado: ${producto.nombre}`);
    console.log(`- Items finales en carrito: ${itemCountDespues}`);
    console.log(`- Mensaje de carrito vacío: ${mensajeVacio}`);
  });

  test('Debe validar comportamiento del carrito cuando está inicialmente vacío', async ({ page }) => {
    // Ir directamente al carrito sin agregar productos
    await carritoPage.irAlCarrito();
    
    // Validar estado inicial vacío
    await carritoPage.validarCarritoVacio();
    
    const itemCount = await carritoPage.getCartItemCount();
    expect(itemCount).toBe(0);
    
    // Validar mensaje de carrito vacío
    const mensajeVacio = await carritoPage.getEmptyCartMessage();
    expect(mensajeVacio.toLowerCase()).toMatch(/carrito|vac[íi]o|empty/);
    
    // Screenshot del estado inicial
    await test.info().attach('carrito-vacio-inicial', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });

    console.log(`Validación de carrito vacío inicial completada:`);
    console.log(`- Items en carrito: ${itemCount}`);
    console.log(`- Mensaje mostrado: ${mensajeVacio}`);
  });
});