import { CategoryFilter } from '../CategoryFilter';
import { useState } from 'react';

export default function CategoryFilterExample() {
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Appetizers', 'Entrees', 'Drinks', 'Desserts'];

  return (
    <CategoryFilter
      categories={categories}
      activeCategory={activeCategory}
      onCategoryChange={(cat) => {
        setActiveCategory(cat);
        console.log('Category changed:', cat);
      }}
    />
  );
}
