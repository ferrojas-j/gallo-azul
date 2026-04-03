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

const v = (label: string, price: number): MenuVariant => ({
  id: `${label}-${price}`,
  label,
  price,
  active: true,
});

const breadVariants = (p1: number, p2: number): MenuVariant[] => [
  v('Pan Blanco', p1),
  v('Integral', p2),
];

const flourVariants = (p1: number, p2: number): MenuVariant[] => [
  v('Harina Blanca', p1),
  v('Integral', p2),
];

export const CATEGORIES = [
  'Sandwiches', 'Waffles Dulces', 'Waffles Salados', 'Bocado Integral',
  'Bebidas Frías', 'Bebidas Calientes', 'Fruta', 'Huevos',
  'Pan', 'Tortilla', 'Orden Extra', 'Opciones y Adicionales',
];

const item = (id: string, name: string, price: number, category: string, opts?: Partial<MenuItem>): MenuItem => ({
  id, name, price, category, active: true, hasVariants: false, ...opts,
});

const sandwich = (id: string, name: string, p1: number, p2: number): MenuItem => ({
  id, name, price: p1, category: 'Sandwiches', active: true,
  hasVariants: true, variantType: 'bread', variants: breadVariants(p1, p2),
});

const waffleDulce = (id: string, name: string, p1: number, p2: number): MenuItem => ({
  id, name, price: p1, category: 'Waffles Dulces', active: true,
  hasVariants: true, variantType: 'flour', variants: flourVariants(p1, p2),
});

const waffleSalado = (id: string, name: string, p1: number, p2: number): MenuItem => ({
  id, name, price: p1, category: 'Waffles Salados', active: true,
  hasVariants: true, variantType: 'flour', variants: flourVariants(p1, p2),
});

export const MENU_ITEMS: MenuItem[] = [
  // Sandwiches
  sandwich('sw-espanol',   'Español',      135, 140),
  sandwich('sw-ligero',    'Ligero',        135, 140),
  sandwich('sw-mexicano',  'Mexicano',      125, 130),
  sandwich('sw-yucateco',  'Yucateco',      115, 120),
  sandwich('sw-marino',    'Marino',        105, 110),
  sandwich('sw-blt',       'BLT Aguacate',  105, 110),
  sandwich('sw-veggie',    'Vegetariano',    95, 100),
  sandwich('sw-oaxaqueno', 'Oaxaqueño',      95, 100),
  sandwich('sw-molletes',  'Molletes',       95, 100),

  // Waffles Dulces
  waffleDulce('wd-manzana',  'Manzana y Helado',  125, 130),
  waffleDulce('wd-fruta',    'Fruta',             125, 130),
  waffleDulce('wd-queso',    'Queso',             105, 110),
  waffleDulce('wd-choco',    'Chocolate',         105, 110),
  waffleDulce('wd-platano',  'Plátano y Crema',   105, 110),
  waffleDulce('wd-sencillo', 'Sencillito',         90,  95),

  // Waffles Salados
  waffleSalado('ws-guaca', 'Queso y Guacamole', 135, 140),
  waffleSalado('ws-huevo', 'Huevo y Jamón',     135, 140),

  // Bocado Integral
  item('bi-cabra',   'Queso de Cabra y Aguacate', 75, 'Bocado Integral'),
  item('bi-panela',  'Queso Panela y Aguacate',   75, 'Bocado Integral'),
  item('bi-jamon',   'Jamón y Huevo',             75, 'Bocado Integral'),
  item('bi-quesillo','Quesillo y Frijol',         70, 'Bocado Integral'),
  item('bi-cacahuate','Crema de Cacahuate',       70, 'Bocado Integral'),

  // Bebidas Frías
  item('bf-naranja',  'Jugo de Naranja',                         55, 'Bebidas Frías'),
  item('bf-zanahoria','Jugo de Zanahoria',                        55, 'Bebidas Frías'),
  item('bf-mixto',    'Jugo Mixto (Naranja con Zanahoria)',       55, 'Bebidas Frías'),
  item('bf-verde',    'Jugo Verde',                              60, 'Bebidas Frías'),
  item('bf-limonada', 'Limonada o Naranjada mineral',            45, 'Bebidas Frías'),
  item('bf-agua',     'Agua de la casa (limón y hierbabuena)',   25, 'Bebidas Frías'),
  item('bf-esprRocas','Espresso Doble en las Rocas',             55, 'Bebidas Frías'),
  item('bf-esprHelado','Espresso Doble sobre Helado de Vainilla',75, 'Bebidas Frías'),
  item('bf-capFrio',  'Capuccino Frío',                         70, 'Bebidas Frías'),
  item('bf-frapu',    'Frapuchino',                             95, 'Bebidas Frías'),
  item('bf-moka',     'Mokachino',                              95, 'Bebidas Frías'),
  item('bf-leche',    'Vaso de Leche Fría',                     30, 'Bebidas Frías'),
  item('bf-licChoco', 'Licuado Frío de Chocolate',              55, 'Bebidas Frías'),
  item('bf-licPlata', 'Licuado de Plátano y Miel',             55, 'Bebidas Frías'),
  item('bf-licChban', 'Licuado Choco-Banana',                  55, 'Bebidas Frías'),
  item('bf-malteada', 'Malteada Vainilla ó Chocolate',         85, 'Bebidas Frías'),
  item('bf-refresco', 'Refrescos',                             25, 'Bebidas Frías'),
  item('bf-cerveza',  'Cerveza (Corona, Victoria)',            35, 'Bebidas Frías'),
  item('bf-kombucha', 'Kombucha',                              65, 'Bebidas Frías'),

  // Bebidas Calientes
  item('bc-americano',  'Café Americano',             40, 'Bebidas Calientes'),
  item('bc-espresso',   'Café Espresso',              40, 'Bebidas Calientes'),
  item('bc-esprDoble',  'Café Espresso Doble',        50, 'Bebidas Calientes'),
  item('bc-macchiato',  'Café Espresso Macchiato',    40, 'Bebidas Calientes'),
  item('bc-panna',      'Café Espresso Panna',        50, 'Bebidas Calientes'),
  item('bc-latte',      'Café Latte',                 50, 'Bebidas Calientes'),
  item('bc-capTaza',    'Café Capuccino (taza alta)', 50, 'Bebidas Calientes'),
  item('bc-capItal',    'Café Capuccino Italiano',    50, 'Bebidas Calientes'),
  item('bc-capMoka',    'Café Capuccino Moka',        60, 'Bebidas Calientes'),
  item('bc-flatWhite',  'Café Flat White',            60, 'Bebidas Calientes'),
  item('bc-capViene',   'Café Capuccino Vienés',      60, 'Bebidas Calientes'),
  item('bc-chocolate',  'Chocolate Caliente',         50, 'Bebidas Calientes'),
  item('bc-te',         'Té orgánico en infusión',   40, 'Bebidas Calientes'),

  // Fruta
  item('fr-ensalada',  'Ensalada de Frutas',                        85, 'Fruta'),
  item('fr-ensYogurt', 'Ensalada de Frutas con Yogurt y Granola',  100, 'Fruta'),
  item('fr-yogurt',    'Yogurt Natural con Granola',                55, 'Fruta'),
  item('fr-yogFruta',  'Yogurt Natural con Granola y Fruta Picada', 65, 'Fruta'),

  // Huevos
  item('hu-omeletteC',  'Omelette Clásico',                  95, 'Huevos'),
  item('hu-omeletteE',  'Omelette de Espinacas',             95, 'Huevos'),
  item('hu-frittata',   'Frittata de Calabacitas',           95, 'Huevos'),
  item('hu-tocino',     'Estrellado con Tocino',             90, 'Huevos'),
  item('hu-revueltos',  'Revueltos con Jamón o Chorizo',     90, 'Huevos'),
  item('hu-rancheros',  'Rancheros o Divorciados',           85, 'Huevos'),
  item('hu-mexicana',   'Revueltos a la mexicana o ejote',   85, 'Huevos'),

  // Pan
  item('pa-payQueso',  'Pay de Queso',              65, 'Pan'),
  item('pa-chocolate', 'Pastel de Chocolate',        65, 'Pan'),
  item('pa-zanahoria', 'Pastel de Zanahoria',        65, 'Pan'),
  item('pa-tostBlanco','Pan Tostado Blanco',         65, 'Pan'),
  item('pa-tostInteg', 'Pan Tostado Integral (75%)', 75, 'Pan'),
  item('pa-galleta',   'Galleta Artesanal',          10, 'Pan'),

  // Tortilla
  item('to-chipoquiles','Chipoquiles',                                      100, 'Tortilla'),
  item('to-chilaVerdes','Chilaquiles Verdes',                                90, 'Tortilla'),
  item('to-chilaHuevo', 'Chilaquiles Verdes con 1 o 2 Huevos Estrellados', 100, 'Tortilla'),
  item('to-quesadillas','Quesadillas Popeye',                                90, 'Tortilla'),
  item('to-guacamole',  'Guacamole',                                         90, 'Tortilla'),

  // Orden Extra
  item('oe-jamonPech', 'Jamón de Pechuga de pavo',   35, 'Orden Extra'),
  item('oe-jamonPierna','Jamón de pierna',            35, 'Orden Extra'),
  item('oe-tocino',    'Tocino',                      35, 'Orden Extra'),
  item('oe-aguacate',  'Aguacate',                   20, 'Orden Extra'),
  item('oe-quesofr',   'Queso fresco',               20, 'Orden Extra'),
  item('oe-panInteg',  '1 Rebanada de pan integral', 20, 'Orden Extra'),
  item('oe-huevo',     '1 Huevo estrellado o revuelto',20,'Orden Extra'),
  item('oe-frijoles',  'Frijoles',                   20, 'Orden Extra'),

  // Opciones y Adicionales
  item('op-sinGluten',  'Waffle con harina sin gluten',        25, 'Opciones y Adicionales'),
  item('op-lecheVeg',   'Con Bebida Soya, Almendra o Coco',   10, 'Opciones y Adicionales'),
  item('op-descaf',     'Con Café Descafeinado',               5, 'Opciones y Adicionales'),
  item('op-vaso',       'Vaso Biodegradable para llevar',      5, 'Opciones y Adicionales'),
];
