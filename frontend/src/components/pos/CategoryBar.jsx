export default function CategoryBar({ categories, active, onSelect }) {
  return (
    <div className="pos-categories" role="tablist" aria-label="Categorías del menú">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={active === category.id}
          className={`pos-category${active === category.id ? ' is-active' : ''}`}
          onClick={() => onSelect(category.id)}
        >
          <span className="pos-category-icon" aria-hidden="true">{category.icon}</span>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}
