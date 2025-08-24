import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2Icon className="animate-spin w-12 h-12 text-gray-400" />
      <span className="text-lg font-medium text-gray-600">
        Making checkout secure...
      </span>
    </div>
  );
}
