export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-[#A5243D]/15" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#A5243D] animate-spin" />
        </div>
      </div>
    </div>
  );
}
