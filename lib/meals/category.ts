// Classement heuristique d'un produit dans un rayon de supermarché à partir de
// son nom. 100% local (aucun appel réseau) : un dictionnaire de mots-clés FR +
// un rayon « Divers » par défaut. Déterministe → calculable à la volée, rien à
// persister. Améliorable plus tard par un LLM sur les seuls produits « Divers ».
//
// Stratégie : correspondance la plus SPÉCIFIQUE (longest match). On teste tous
// les mots-clés de tous les rayons ; celui dont le mot-clé reconnu est le plus
// long l'emporte. Ça règle les collisions classiques : « fruits de mer » (mer)
// bat « fruit » (produce), « jus de fruit » bat « fruit », « veau » bat « eau ».

export type CategoryKey =
  | 'produce' | 'butchery' | 'dairy' | 'bakery' | 'grocery_savory'
  | 'grocery_sweet' | 'frozen' | 'drinks' | 'household' | 'other'

export type Category = { key: CategoryKey; label: string; emoji: string }

// Ordre = parcours type d'un supermarché (sert à ordonner les sections).
export const CATEGORIES: Category[] = [
  { key: 'produce', label: 'Fruits & légumes', emoji: '🥦' },
  { key: 'butchery', label: 'Boucherie & poissonnerie', emoji: '🥩' },
  { key: 'dairy', label: 'Crèmerie & frais', emoji: '🧀' },
  { key: 'bakery', label: 'Pains & pâtisserie', emoji: '🥖' },
  { key: 'grocery_savory', label: 'Épicerie salée', emoji: '🥫' },
  { key: 'grocery_sweet', label: 'Épicerie sucrée', emoji: '🍫' },
  { key: 'frozen', label: 'Surgelés', emoji: '🧊' },
  { key: 'drinks', label: 'Boissons', emoji: '🥤' },
  { key: 'household', label: 'Hygiène & maison', emoji: '🧻' },
  { key: 'other', label: 'Divers', emoji: '🛒' },
]

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))
export const OTHER = CATEGORY_BY_KEY.get('other')!

// Mots-clés normalisés (minuscules, sans accent). Comparaison par sous-chaîne.
const KEYWORDS: Record<Exclude<CategoryKey, 'other'>, string[]> = {
  produce: [
    'tomate', 'salade', 'laitue', 'roquette', 'mache', 'carotte', 'pomme de terre',
    'patate', 'oignon', 'echalote', 'ail', 'courgette', 'aubergine', 'poivron',
    'concombre', 'brocoli', 'chou', 'chou-fleur', 'epinard', 'haricot vert',
    'petit pois', 'champignon', 'poireau', 'celeri', 'radis', 'betterave', 'navet',
    'potiron', 'courge', 'butternut', 'avocat', 'citron', 'orange', 'pomme', 'poire',
    'banane', 'fraise', 'framboise', 'myrtille', 'raisin', 'peche', 'abricot',
    'cerise', 'melon', 'pasteque', 'ananas', 'mangue', 'kiwi', 'clementine',
    'mandarine', 'pamplemousse', 'figue', 'prune', 'rhubarbe', 'persil', 'basilic',
    'coriandre', 'menthe', 'ciboulette', 'gingembre', 'legume', 'fruit', 'crudite',
  ],
  butchery: [
    'viande', 'boeuf', 'veau', 'porc', 'agneau', 'poulet', 'volaille', 'dinde',
    'canard', 'lapin', 'saucisse', 'saucisson', 'merguez', 'chipolata', 'jambon',
    'lardon', 'bacon', 'steak', 'escalope', 'cote de', 'roti', 'viande hachee',
    'hache', 'poisson', 'saumon', 'thon', 'cabillaud', 'colin', 'lieu', 'crevette',
    'gambas', 'moule', 'huitre', 'fruits de mer', 'calamar', 'crabe', 'sardine',
    'maquereau', 'truite', 'dorade', 'sole', 'lotte', 'saint-jacques', 'surimi',
  ],
  dairy: [
    'lait', 'creme', 'creme fraiche', 'beurre', 'fromage', 'fromage blanc', 'yaourt',
    'yogourt', 'oeuf', 'parmesan', 'mozzarella', 'emmental', 'gruyere', 'comte',
    'chevre', 'feta', 'ricotta', 'mascarpone', 'camembert', 'brie', 'raclette',
    'reblochon', 'skyr', 'petit suisse', 'boursin', 'cancoillotte',
  ],
  bakery: [
    'pain', 'baguette', 'brioche', 'croissant', 'viennoiserie', 'pain de mie',
    'biscotte', 'tarte', 'wrap', 'tortilla', 'pita', 'fougasse', 'ficelle',
  ],
  grocery_savory: [
    'pate', 'pates', 'spaghetti', 'penne', 'tagliatelle', 'lasagne', 'ravioli',
    'riz', 'semoule', 'couscous', 'boulgour', 'quinoa', 'lentille', 'pois chiche',
    'haricot sec', 'conserve', 'boite de', 'sauce', 'concentre', 'tomate pelee',
    'huile', 'vinaigre', 'sel', 'poivre', 'epice', 'moutarde', 'ketchup',
    'mayonnaise', 'bouillon', 'farine', 'levure', 'cornichon', 'olive', 'pesto',
    'soja', 'nem', 'galette', 'chips', 'cacahuete', 'gateau aperitif', 'tapenade',
  ],
  grocery_sweet: [
    'sucre', 'chocolat', 'bonbon', 'biscuit', 'cookie', 'gateau', 'cereale',
    'confiture', 'miel', 'nutella', 'pate a tartiner', 'compote', 'gaufre',
    'madeleine', 'barre chocolatee', 'cafe', 'the', 'infusion', 'cacao', 'sirop',
  ],
  frozen: [
    'surgele', 'congele', 'glace', 'glacon', 'frites', 'pizza surgelee',
    'legumes surgeles', 'sorbet',
  ],
  drinks: [
    'eau', 'jus', 'jus de fruit', 'soda', 'coca', 'limonade', 'biere', 'vin',
    'champagne', 'alcool', 'whisky', 'vodka', 'rhum', 'the glace', 'ice tea',
    'cidre', 'pastis', 'ricard', 'aperol', 'spritz', 'boisson', 'perrier', 'schweppes',
  ],
  household: [
    'papier toilette', 'essuie-tout', 'sopalin', 'mouchoir', 'savon', 'gel douche',
    'shampoing', 'dentifrice', 'deodorant', 'lessive', 'liquide vaisselle', 'eponge',
    'sac poubelle', 'aluminium', 'film etirable', 'allumette', 'bougie', 'pile',
    'ampoule', 'nettoyant', 'javel', 'coton', 'rasoir', 'serviette', 'tampon',
    'couche', 'papier', 'gobelet', 'assiette jetable',
  ],
}

// Paires (mot-clé normalisé, rayon) triées par longueur décroissante : la
// première correspondance rencontrée est donc la plus spécifique.
const RULES: { keyword: string; key: CategoryKey }[] = Object.entries(KEYWORDS)
  .flatMap(([key, words]) => words.map((keyword) => ({ keyword, key: key as CategoryKey })))
  .sort((a, b) => b.keyword.length - a.keyword.length)

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/\u0153/g, 'oe')        // \u0153 (non d\u00e9compos\u00e9e par NFD)
    .replace(/\u00e6/g, 'ae')        // \u00e6
    .trim()
}

// Rayon d'un produit. Renvoie toujours une catégorie (« Divers » par défaut).
export function categorize(name: string): Category {
  const n = normalize(name)
  if (!n) return OTHER
  for (const rule of RULES) {
    if (n.includes(rule.keyword)) return CATEGORY_BY_KEY.get(rule.key)!
  }
  return OTHER
}

// Regroupe des éléments par rayon, dans l'ordre supermarché, en ignorant les
// rayons vides. `nameOf` extrait le nom depuis chaque élément.
export function groupByCategory<T>(
  items: T[],
  nameOf: (item: T) => string,
): { category: Category; items: T[] }[] {
  const buckets = new Map<CategoryKey, T[]>()
  for (const item of items) {
    const { key } = categorize(nameOf(item))
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  return CATEGORIES.flatMap((category) => {
    const list = buckets.get(category.key)
    return list && list.length ? [{ category, items: list }] : []
  })
}
