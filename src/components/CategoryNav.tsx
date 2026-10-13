import React from 'react';
import {
  Smartphone,
  Laptop,
  Tv,
  Shirt,
  Sparkles,
  Home,
  Wrench,
  Car,
  Dumbbell,
  Gamepad2,
  BookOpen,
  Dog,
  Baby,
  Flower2,
  Grid
} from 'lucide-react';

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categoriesWithCount?: Record<string, number>;
}

export const CATEGORIES = [
  { id: 'all', label: 'Todas as Categorias', icon: Grid },
  { id: 'Celulares e Smartphones', label: 'Celulares & Smartphones', icon: Smartphone },
  { id: 'Informática e Computadores', label: 'Informática & PCs', icon: Laptop },
  { id: 'Eletrônicos, Áudio e Vídeo', label: 'Eletrônicos & Áudio', icon: Tv },
  { id: 'Roupas, Calçados e Acessórios', label: 'Moda, Calçados & Acessórios', icon: Shirt },
  { id: 'Beleza e Cosméticos', label: 'Beleza & Cosméticos', icon: Sparkles },
  { id: 'Casa, Móveis e Decoração', label: 'Casa & Decoração', icon: Home },
  { id: 'Eletrodomésticos', label: 'Eletrodomésticos & Cozinha', icon: Home },
  { id: 'Ferramentas e Construção', label: 'Ferramentas & Hardware', icon: Wrench },
  { id: 'Automóveis', label: 'Automotivo', icon: Car },
  { id: 'Esportes e Fitness', label: 'Esportes & Fitness', icon: Dumbbell },
  { id: 'Brinquedos e Jogos', label: 'Brinquedos & Games', icon: Gamepad2 },
  { id: 'Livros e Papelaria', label: 'Livros & Papelaria', icon: BookOpen },
  { id: 'Produtos para Pets', label: 'Pet Shop', icon: Dog },
  { id: 'Bebês e Maternidade', label: 'Bebês & Maternidade', icon: Baby },
  { id: 'Jardinagem e Lazer', label: 'Jardim & Lazer', icon: Flower2 },
];

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  categoriesWithCount = {}
}) => {
  return (
    <div id="categories-section" className="py-4 border-b border-slate-800 bg-[#0B0F19]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'all'
              ? Object.values(categoriesWithCount).reduce((acc, curr) => acc + curr, 0)
              : categoriesWithCount[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
