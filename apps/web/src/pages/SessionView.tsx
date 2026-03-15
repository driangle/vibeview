import { useParams } from "react-router-dom";

export function SessionView() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Session: {id}</h1>
      <p className="mt-2 text-gray-600">Session details will appear here.</p>
    </div>
  );
}
