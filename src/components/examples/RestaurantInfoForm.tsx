import { RestaurantInfoForm } from '../RestaurantInfoForm';

export default function RestaurantInfoFormExample() {
  return (
    <div className="max-w-2xl">
      <RestaurantInfoForm
        initialData={{
          name: 'The Golden Bistro',
          description: 'Experience culinary excellence',
          address: '123 Main Street',
          phone: '(555) 123-4567',
          hours: 'Mon-Sun: 11AM - 10PM',
        }}
        onSubmit={(data) => console.log('Form submitted:', data)}
      />
    </div>
  );
}
