// Loading fallback component
export default function PageLoader() {
  return (
    <div className="min-h-screen w-full bg-[url('/images/goose.png')] flex items-center justify-center bg-cover bg-center relative text-white bg-no-repeat bg-black">
      <div className="w-24 h-24 border-8 border-yellow-600 rounded-full border-t-yellow-800 animate-spin" />
    </div>
  );
}
