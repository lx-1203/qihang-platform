export default function MentorLockedState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </section>
  );
}
