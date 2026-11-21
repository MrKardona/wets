// Kits armados con cositas bajo encargo (ids de datos/encargo.json).
// Precio = suma de sus productos (los bajo encargo no tienen descuento por cantidad).
// Si un producto se agota y sale del catálogo, el build lo quita del kit; un kit con menos de 2 se oculta.
export const KITS_ENCARGO = [
  {
    id: "kit-sueno-profundo",
    nombre: "Kit Sueño profundo",
    para: "Para descansar mejor",
    nota: "Melatonina para conciliar el sueño, magnesio con ashwagandha para relajarte y un spray de almohada con aceites esenciales.",
    items: ["melatonina-natrol-10mg-90-gomitas", "glicinato-de-magnesio-ashwagandha-carlyle-120-capsulas", "spray-con-melatonina-y-aceites-esenciales-dr-teals-177-ml"],
  },
  {
    id: "kit-cabello-fuerte",
    nombre: "Kit Cabello fuerte",
    para: "Para un cabello más fuerte",
    nota: "Dos aceites capilares Difeel, de romero con menta y de biotina, más gomitas de biotina para cuidarlo por dentro.",
    items: ["aceite-capilar-romero-menta-difeel-237ml", "aceite-capilar-de-biotina-difeel-237ml", "hair-skin-nails-advanced-2x-biotin-80-gomitas"],
  },
  {
    id: "kit-belleza-desde-adentro",
    nombre: "Kit Belleza desde adentro",
    para: "Piel, cabello y uñas",
    nota: "Colágeno marino con ácido hialurónico, biotina y vitamina C liposomal, que ayuda a formar colágeno.",
    items: ["colageno-marino-peptidos-neocell-120-capsulas", "biotina-natures-bounty-10-000mcg-120-capsulas", "vitamina-c-liposomal-carlyle-2-200mg-90-softgels"],
  },
  {
    id: "kit-defensas",
    nombre: "Kit Defensas",
    para: "Para toda la familia adulta",
    nota: "El trío clásico para el sistema inmune: vitamina C, zinc y vitamina D3 con K2.",
    items: ["vitamina-c-carlyle-2-000mg-150-capletas", "picolinato-de-zinc-nutricost-50mg-240-capsulas", "vitamina-d3-k2-deal-supplement-250-softgels"],
  },
  {
    id: "kit-digestion-ligera",
    nombre: "Kit Digestión ligera",
    para: "Para el estómago y la flora",
    nota: "Probióticos para mujer, enzimas digestivas con prebióticos y vinagre de sidra de manzana en cápsulas.",
    items: ["probioticos-de-mujer-trunature-90-capsulas", "enzimas-digestivas-prebioticos-y-probioticos-horbaach-1-000mg-100-capsulas", "vinagre-de-sidra-de-manzana-2-400mg-horbaach-150-capsulas"],
  },
  {
    id: "kit-ducha-vanilla-cashmere",
    nombre: "Kit Ducha Vanilla Cashmere",
    para: "Todo con el mismo aroma",
    nota: "Jabón, crema corporal y aceite de afeitar EOS Vanilla Cashmere: la rutina de ducha completa con un solo aroma.",
    items: ["jabon-corporal-eos-vanilla-cashmere-473-ml", "crema-hidratante-corporal-eos-vanilla-cashmere-473-ml", "aceite-de-afeitar-eos-vanilla-cashmere-177ml"],
  },
  {
    id: "kit-glow-corporal",
    nombre: "Kit Glow corporal",
    para: "Piel suave y luminosa",
    nota: "Exfolias con Dove, hidratas con la crema Cocoa Radiant y terminas con el aceite Golden Hour Glow para el brillo.",
    items: ["exfoliante-corporal-dove-vainilla-sugar-shea-butter-425g", "crema-corporal-hidratante-cocoa-vaseline-600-ml", "aceite-corporal-golden-hour-glow-vaseline-200ml"],
  },
  {
    id: "kit-mama",
    nombre: "Kit Mamá",
    para: "Embarazo y posparto",
    nota: "Bálsamo y crema de masaje Palmer's para la piel que se estira, y un multivitamínico prenatal. Consulta a tu médico antes de tomar suplementos en el embarazo.",
    items: ["balsamo-de-tratamiento-intensivo-contra-las-estrias-palmers-4-4-onzas", "locion-corporal-de-masaje-con-formula-de-manteca-de-cacao-para-estrias-palmers-315ml", "multivitaminico-prenatal-carlyle-120-capsulas"],
  },
  {
    id: "kit-labios",
    nombre: "Kit Labios",
    para: "Uno para cada bolso",
    nota: "Tres Vaseline Lip Therapy: Rosé, Berry Much y Creme Brulee.",
    items: ["hidratante-de-labios-lip-balm-rose-vaseline-7g", "hidratante-de-labios-lip-balm-wild-berry-vaseline-7g", "hidratante-de-labios-creme-brulee-vaseline"],
  },
  {
    id: "kit-energia",
    nombre: "Kit Energía y corazón",
    para: "Para el día a día",
    nota: "Omega 3, súper complejo B y CoQ10 de 300 mg.",
    items: ["omega-3-fish-oil-now-200-softgels", "super-complejo-b-kirkland-500-tabletas", "coq10-kirkland-300mg-100-softgels"],
  },
  {
    id: "kit-rostro-cerave",
    nombre: "Kit Rostro básico",
    para: "Limpiar, hidratar y proteger",
    nota: "Limpiador espumoso y loción hidratante CeraVe, más protector solar Neutrogena SPF 70.",
    items: ["limpiador-facial-espumoso-cerave-237ml", "locion-hidratante-para-piel-seca-a-muy-seca-cerave-236ml", "protector-solar-neutrogena-spf-70-88ml"],
  },
];
