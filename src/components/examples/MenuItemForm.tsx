import { MenuItemForm } from '../MenuItemForm';

export default function MenuItemFormExample() {
  return (
    <div className="max-w-2xl">
      <MenuItemForm
        onSubmit={(data) => console.log('Item created:', data)}
        onCancel={() => console.log('Cancelled')}
      />
    </div>
  );
}
