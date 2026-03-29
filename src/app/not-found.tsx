import Link from "next/link";
import { Search, Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 md:py-32">
      <div className="text-center max-w-lg">
        <p className="text-8xl md:text-9xl mb-6 select-none animate-bounce">🦊</p>

        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-800 mb-2">
          404
        </h1>
        <p className="text-xl md:text-2xl font-bold text-slate-700 mb-3">
          ページが見つかりません
        </p>
        <p className="text-slate-500 mb-10 leading-relaxed">
          お探しのページは移動・削除されたか、<br className="hidden sm:block" />
          URLが間違っている可能性があります。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <Home size={18} /> トップページへ
            </Button>
          </Link>
          <Link href="/area">
            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
              <MapPin size={18} /> エリアから探す
            </Button>
          </Link>
        </div>

        <div className="max-w-sm mx-auto">
          <p className="text-sm text-slate-400 mb-3">キーワードで店舗を探す</p>
          <form action="/search" className="flex rounded-xl overflow-hidden shadow-md">
            <input
              name="keyword"
              type="text"
              placeholder="店舗名・エリア名で検索..."
              className="flex-1 px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-inset"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 transition-colors"
            >
              <Search size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
