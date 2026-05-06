export type MenuVariant = {
  id: string;
  label: string;
  price: number;
  active: boolean;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId?: string;
  active: boolean;
  hasVariants: boolean;
  variantType?: 'bread' | 'flour';
  variants?: MenuVariant[];
};

export const CATEGORIES = [
  'ENSALADAS', 'PASTAS', 'PIZZAS', 'BEBIDAS'
];

// Mapping for grouped categories
export const CATEGORY_MAPPING: Record<string, string[]> = {
  'INGREDIENTES EXTRA': ['EXTRAS: VEGETALES', 'EXTRAS: QUESOS', 'EXTRAS: CARNES'],
  'BEBIDAS': ['BEBIDAS: AGUAS FRESCAS', 'BEBIDAS: CERVEZAS Y SANGRÍAS', 'BEBIDAS: MARGARITAS', 'BEBIDAS: MEZCALITAS', 'BEBIDAS: VINO BLANCO', 'BEBIDAS: VINO TINTO', 'BEBIDAS: MEZCALES', 'BEBIDAS: TEQUILAS']
};


const item = (id: string, name: string, price: number, category: string): MenuItem => ({
  id, name, price, category, active: true, hasVariants: false,
});

export const MENU_ITEMS: MenuItem[] = [
  // ENSALADAS
  item('en-cesar', 'César', 190, 'ENSALADAS'),
  item('en-frescos', 'Vegetales frescos', 190, 'ENSALADAS'),

  // PASTAS
  {
    id: 'pa-putanesca',
    name: 'Putanesca',
    price: 260,
    category: 'PASTAS',
    active: true,
    hasVariants: true,
    variants: [
      { id: 'pa-put-pollo', label: 'Con Pollo', price: 260, active: true },
      { id: 'pa-put-camaron', label: 'Con Camarón', price: 260, active: true },
      { id: 'pa-put-salchicha', label: 'Con Salchicha', price: 260, active: true },
      { id: 'pa-put-sola', label: 'Sola', price: 260, active: true },
    ]
  },
  {
    id: 'pa-alfredo',
    name: 'Alfredo',
    price: 260,
    category: 'PASTAS',
    active: true,
    hasVariants: true,
    variants: [
      { id: 'pa-alf-pollo', label: 'Con Pollo', price: 260, active: true },
      { id: 'pa-alf-camaron', label: 'Con Camarón', price: 260, active: true },
      { id: 'pa-alf-salchicha', label: 'Con Salchicha', price: 260, active: true },
      { id: 'pa-alf-sola', label: 'Sola', price: 260, active: true },
    ]
  },

  // PIZZAS
  item('pi-margherita', 'Margherita', 180, 'PIZZAS'),
  item('pi-siciliana', 'Siciliana', 225, 'PIZZAS'),
  item('pi-pescatore', 'Pescatore', 235, 'PIZZAS'),
  item('pi-napoletana', 'Napoletana', 245, 'PIZZAS'),
  item('pi-hawaiana', 'Hawaiana', 245, 'PIZZAS'),
  item('pi-mexicana', 'Mexicana', 255, 'PIZZAS'),
  item('pi-capricciosa', 'Capricciosa', 255, 'PIZZAS'),
  item('pi-stagioni', 'Stagioni', 255, 'PIZZAS'),
  item('pi-quattro', 'Quattro Formaggi', 260, 'PIZZAS'),
  item('pi-italiana', 'Italiana', 260, 'PIZZAS'),
  item('pi-gamberetta', 'Gamberetta', 260, 'PIZZAS'),
  item('pi-putanesca-p', 'Putanesca (Pizza)', 260, 'PIZZAS'),
  item('pi-special', 'Gallo Azul Special', 260, 'PIZZAS'),

  // EXTRAS: VEGETALES
  item('ex-ajo', 'Ajo rostizado', 40, 'EXTRAS: VEGETALES'),
  item('ex-champ', 'Champiñones', 40, 'EXTRAS: VEGETALES'),
  item('ex-tom-f', 'Tomates frescos', 40, 'EXTRAS: VEGETALES'),
  item('ex-tom-d', 'Tomates deshidratados', 40, 'EXTRAS: VEGETALES'),
  item('ex-aceit-n', 'Aceitunas negras', 40, 'EXTRAS: VEGETALES'),
  item('ex-aceit-c', 'Aceitunas Calmata', 40, 'EXTRAS: VEGETALES'),
  item('ex-alca', 'Corazones de alcachofa', 40, 'EXTRAS: VEGETALES'),
  item('ex-pimi', 'Pimientos rojos', 40, 'EXTRAS: VEGETALES'),
  item('ex-cebolla', 'Cebollas caramelizadas', 40, 'EXTRAS: VEGETALES'),
  item('ex-papa', 'Papas', 40, 'EXTRAS: VEGETALES'),
  item('ex-focaccia', 'Focaccia', 40, 'EXTRAS: VEGETALES'),

  // EXTRAS: QUESOS
  item('ex-mozz', 'Mozzarella', 70, 'EXTRAS: QUESOS'),
  item('ex-cabra', 'Queso de cabra', 70, 'EXTRAS: QUESOS'),
  item('ex-gorg', 'Gorgonzola', 70, 'EXTRAS: QUESOS'),
  item('ex-parm', 'Parmesano reggiano', 70, 'EXTRAS: QUESOS'),

  // EXTRAS: CARNES
  item('ex-salch', 'Salchicha italiana', 90, 'EXTRAS: CARNES'),
  item('ex-salami', 'Salami', 90, 'EXTRAS: CARNES'),
  item('ex-peppe', 'Pepperoni', 90, 'EXTRAS: CARNES'),
  item('ex-anchoa', 'Anchoas', 90, 'EXTRAS: CARNES'),
  item('ex-pollo-ex', 'Pollo', 90, 'EXTRAS: CARNES'),
  item('ex-camaron-ex', 'Camarón', 90, 'EXTRAS: CARNES'),

  // BEBIDAS: MARGARITAS
  item('dr-mar-clas', 'Clásica (M)', 90, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-baja', 'Baja (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-tama', 'Tamarindo (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-jam', 'Jamaica (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-alb', 'Albahaca (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-pepi', 'Pepino-Chile (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-jala', 'Jalapeño spicy (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-fresa', 'Fresa (M)', 110, 'BEBIDAS: MARGARITAS'),
  item('dr-mar-mango', 'Mango (M)', 110, 'BEBIDAS: MARGARITAS'),

  // BEBIDAS: MEZCALITAS
  item('dr-mez-clas', 'Clasica (Z)', 140, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-baja', 'Baja (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-tama', 'Tamarindo (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-jam', 'Jamaica (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-alb', 'Albahaca (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-pepi', 'Pepino-Chile (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-jala', 'Jalapeño spicy (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-fresa', 'Fresa (Z)', 160, 'BEBIDAS: MEZCALITAS'),
  item('dr-mez-mango', 'Mango (Z)', 160, 'BEBIDAS: MEZCALITAS'),

  // BEBIDAS: VINOS
  item('dr-vin-bla', 'Blanco de la casa', 120, 'BEBIDAS: VINOS'),
  item('dr-vin-roj', 'Rojo de la casa', 120, 'BEBIDAS: VINOS'),

  // BEBIDAS: AGUAS FRESCAS
  item('dr-af-tama', 'Tamarindo', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-jam', 'Jamaica', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-hor', 'Horchata-Canela', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-fresa', 'Fresa', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-limo', 'Limonada', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-te', 'Té helado', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-limote', 'Limonada-Té helado', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-naran', 'Agua naranjita', 40, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-coca', 'Coca-Cola', 50, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-cocal', 'Coca-Cola light', 50, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-fresca', 'Fresca', 50, 'BEBIDAS: AGUAS FRESCAS'),
  item('dr-af-topo', 'Agua mineral Topochico', 50, 'BEBIDAS: AGUAS FRESCAS'),

  // BEBIDAS: CERVEZAS Y SANGRÍAS
  item('dr-cv-coro', 'Corona', 60, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
  item('dr-cv-paci', 'Pacífico', 60, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
  item('dr-cv-negm', 'Negra Modelo', 70, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
  item('dr-cv-mich', 'Michelada', 80, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
  item('dr-cv-ciel', 'Cielo rojo', 90, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
  item('dr-cv-sang', 'Garrafa de sangría 1/2L', 150, 'BEBIDAS: CERVEZAS Y SANGRÍAS'),
];
