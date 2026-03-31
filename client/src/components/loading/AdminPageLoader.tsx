// Loading fallback component
export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-24 h-24 border-5 border-yellow-600 rounded-full border-t-yellow-800 animate-spin"></div>
    </div>
  );
}
